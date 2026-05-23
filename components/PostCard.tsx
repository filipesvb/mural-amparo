"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import type { PostWithRelations } from "@/utils/types";
import { EDIT_WINDOW_MS } from "@/utils/feed";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  MAX_POST_IMAGES,
  POST_IMAGES_BUCKET,
  postImageUrl,
} from "@/utils/storage";
import { uploadImages, removeImages } from "@/utils/upload.client";
import { categoryMeta } from "@/utils/categories";
import type { ReactionEmoji } from "@/utils/reactions";
import { canModerate, type Role } from "@/utils/roles";
import { deletePost, editPost } from "@/app/actions";
import Avatar from "./Avatar";
import PostGallery from "./PostGallery";
import ImageLightbox from "./ImageLightbox";
import RoleBadge from "./RoleBadge";
import ReportDialog from "./ReportDialog";
import { PostInteractions } from "./Interactions";
import { RenderWithMentions } from "./MentionsProvider";
import MentionInput from "./MentionInput";

export default function PostCard({
  post,
  user,
  viewerRole,
  onCommentDeleted,
  onReactionChange,
}: {
  post: PostWithRelations;
  user: User | null;
  viewerRole?: Role | null;
  onCommentDeleted?: (postId: number, commentId: number) => void;
  onReactionChange?: (
    postId: number,
    userId: string,
    emoji: ReactionEmoji,
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editError, setEditError] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isReporting, setIsReporting] = useState(false);
  // Estado da edição de galeria: paths antigos mantidos + arquivos novos
  // staged pra upload. Vira o `image_paths` final ao salvar.
  const [editedKeptPaths, setEditedKeptPaths] = useState<string[]>([]);
  const [editedNewFiles, setEditedNewFiles] = useState<File[]>([]);
  const [editedNewPreviews, setEditedNewPreviews] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const displayName = post.profiles?.nickname || post.author_name;

  const authorHref = post.profiles?.nickname
    ? `/perfil/${encodeURIComponent(post.profiles.nickname)}`
    : null;

  const cat = categoryMeta(post.category);

  // Resiliente a posts antigos / payloads sem o campo (mesmo padrão de
  // post.reactions || [] abaixo). A galeria só aparece após rodar a
  // migração notas/creating_post_gallery_schema.sql no Supabase.
  const imagePaths = post.image_paths ?? [];

  const isOwner = !!user && user.id === post.user_id;
  // Staff (moderador/admin) pode apagar recado de qualquer um.
  const canMod = !!user && canModerate(viewerRole);
  const canDelete = isOwner || canMod;
  // Denunciar aparece pra logado que não é dono (staff pode apagar direto,
  // mas também pode denunciar pra deixar trilha no histórico).
  const canReport = !!user && !isOwner;
  const createdAtMs = new Date(post.created_at).getTime();
  const [withinEditWindow, setWithinEditWindow] = useState(
    () => Date.now() - createdAtMs < EDIT_WINDOW_MS,
  );

  useEffect(() => {
    if (!withinEditWindow) return;
    const remaining = createdAtMs + EDIT_WINDOW_MS - Date.now();
    if (remaining <= 0) return;
    const t = setTimeout(() => setWithinEditWindow(false), remaining);
    return () => clearTimeout(t);
  }, [createdAtMs, withinEditWindow]);

  const avatar = (
    <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-mural-line border-b-2 border-mural-brown bg-mural-creme">
      <Avatar
        avatarPath={post.profiles?.avatar_path}
        seed={post.profiles?.avatar_seed}
        name={post.author_name}
        size={40}
        alt={`avatar de ${displayName}`}
      />
    </div>
  );

  function enterEditMode() {
    setEditedKeptPaths(imagePaths);
    setEditedNewFiles([]);
    setEditedNewPreviews([]);
    setEditError("");
    setIsEditing(true);
  }

  function exitEditMode() {
    // Revoga object URLs pra não vazar memória.
    editedNewPreviews.forEach((u) => URL.revokeObjectURL(u));
    setEditedKeptPaths([]);
    setEditedNewFiles([]);
    setEditedNewPreviews([]);
    setEditError("");
    setIsEditing(false);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  }

  function removeKeptImage(path: string) {
    setEditedKeptPaths((prev) => prev.filter((p) => p !== path));
  }

  function removeNewImage(index: number) {
    URL.revokeObjectURL(editedNewPreviews[index]);
    setEditedNewFiles((prev) => prev.filter((_, i) => i !== index));
    setEditedNewPreviews((prev) => prev.filter((_, i) => i !== index));
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  }

  function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    setEditError("");
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setEditError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
        if (editFileInputRef.current) editFileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_POST_IMAGE_BYTES) {
        setEditError("Imagem muito grande. O limite é 5 MB.");
        if (editFileInputRef.current) editFileInputRef.current.value = "";
        return;
      }
    }

    const totalAfter =
      editedKeptPaths.length + editedNewFiles.length + files.length;
    if (totalAfter > MAX_POST_IMAGES) {
      setEditError(`Máximo de ${MAX_POST_IMAGES} imagens por recado.`);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
      return;
    }

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setEditedNewFiles((prev) => [...prev, ...files]);
    setEditedNewPreviews((prev) => [...prev, ...newPreviews]);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  }

  async function handleEditSubmit(formData: FormData) {
    setEditError("");
    startSaveTransition(async () => {
      let uploadedPaths: string[] = [];

      // Sobe as imagens novas primeiro (mesmo padrão da criação de post).
      if (editedNewFiles.length > 0 && user) {
        const up = await uploadImages(
          POST_IMAGES_BUCKET,
          user.id,
          editedNewFiles,
        );
        if ("error" in up) {
          setEditError(up.error);
          return;
        }
        uploadedPaths = up.paths;
      }

      // Marca que estamos enviando o campo de imagens (mesmo que vazio,
      // pra a action saber que o usuário tocou na galeria).
      formData.set("image_paths_present", "1");
      formData.delete("image_paths");
      for (const path of editedKeptPaths) {
        formData.append("image_paths", path);
      }
      for (const path of uploadedPaths) {
        formData.append("image_paths", path);
      }

      const result = await editPost(formData);
      if (result?.error) {
        // Limpa o que subiu agora — a action não vai persistir nada.
        if (uploadedPaths.length > 0) {
          await removeImages(POST_IMAGES_BUCKET, uploadedPaths);
        }
        setEditError(result.error);
        return;
      }
      exitEditMode();
    });
  }

  function handleDelete() {
    const msg = isOwner
      ? "Excluir esse recado? Essa ação não pode ser desfeita."
      : "Excluir o recado deste morador como moderador? Essa ação não pode ser desfeita.";
    if (!confirm(msg)) {
      return;
    }
    startDeleteTransition(async () => {
      await deletePost(post.id);
    });
  }

  return (
    <article
      id={`recado-${post.id}`}
      className="soft-card p-4"
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex gap-3 items-center">
          {authorHref ? (
            <Link href={authorHref} className="shrink-0">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div>
            <p className="font-bold text-mural-ink leading-tight flex items-center gap-1.5">
              {authorHref ? (
                <Link href={authorHref} className="hover:underline">
                  {displayName}
                </Link>
              ) : (
                displayName
              )}
              <RoleBadge role={post.profiles?.role} />
            </p>
            <p className="font-mono text-[11px] text-mural-ink/45">
              {new Date(post.created_at).toLocaleDateString("pt-BR")} às{" "}
              {new Date(post.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-mural-creme border border-mural-line text-mural-ink/70">
              <span className="w-1.5 h-1.5 rounded-full bg-mural-brown" />
              {cat.icon} {cat.label}
            </span>
          </div>
        </div>

        {!isEditing && (canDelete || canReport) && (
          <div className="flex gap-1 text-[10px] font-bold shrink-0">
            {isOwner && withinEditWindow && (
              <button
                onClick={enterEditMode}
                className="px-2 py-1 rounded-lg text-mural-ink/60 hover:bg-mural-creme cursor-pointer transition-colors"
                disabled={isDeleting}
              >
                ✏️ Editar
              </button>
            )}
            {canReport && (
              <button
                onClick={() => setIsReporting(true)}
                title="Denunciar recado"
                className="px-2 py-1 rounded-lg text-mural-ink/60 hover:bg-mural-creme cursor-pointer transition-colors"
              >
                🚩
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                title={isOwner ? "Excluir recado" : "Excluir como moderador"}
                className="px-2 py-1 rounded-lg text-red-700 hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeleting ? "..." : "🗑️"}
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <form action={handleEditSubmit} className="mb-4 space-y-3">
          <input type="hidden" name="post_id" value={post.id} />
          <MentionInput
            as="textarea"
            name="content"
            defaultValue={post.content}
            rows={3}
            className="w-full p-2 bg-mural-creme border border-mural-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
          />

          {(editedKeptPaths.length > 0 || editedNewPreviews.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {editedKeptPaths.map((path) => (
                <div
                  key={path}
                  className="relative w-16 h-16 rounded-lg overflow-hidden ring-1 ring-mural-line"
                >
                  <Image
                    src={postImageUrl(path)}
                    alt="Imagem do recado"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeptImage(path)}
                    disabled={isSaving}
                    title="Remover imagem"
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-700 text-white rounded-full text-[10px] font-bold leading-none flex items-center justify-center cursor-pointer hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {editedNewPreviews.map((url, i) => (
                <div
                  key={url}
                  className="relative w-16 h-16 rounded-lg overflow-hidden ring-1 ring-mural-brown"
                >
                  <Image
                    src={url}
                    alt="Nova imagem"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    disabled={isSaving}
                    title="Remover imagem"
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-700 text-white rounded-full text-[10px] font-bold leading-none flex items-center justify-center cursor-pointer hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {editedKeptPaths.length + editedNewFiles.length < MAX_POST_IMAGES && (
            <div>
              <label className="text-[11px] font-bold text-mural-ink/60 cursor-pointer hover:text-mural-ink transition-colors">
                📷 Adicionar imagem
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleAddImages}
                  disabled={isSaving}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-mural-ink/45 ml-2">
                até {MAX_POST_IMAGES - editedKeptPaths.length - editedNewFiles.length}{" "}
                restantes · 5 MB cada
              </span>
            </div>
          )}

          {editError && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-800 text-sm font-bold">
              ⚠️ {editError}
            </div>
          )}
          <div className="flex gap-2 text-xs font-bold">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-mural-brown text-white px-4 py-1.5 rounded-lg disabled:opacity-50 retro-button-active"
            >
              {isSaving ? "Salvando..." : "💾 Salvar"}
            </button>
            <button
              type="button"
              onClick={exitEditMode}
              disabled={isSaving}
              className="bg-mural-creme border border-mural-line px-4 py-1.5 rounded-lg cursor-pointer hover:brightness-105 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        post.content && (
          <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap text-mural-ink/90">
            <RenderWithMentions text={post.content} />
          </p>
        )
      )}

      {!isEditing && imagePaths.length > 0 && (
        <>
          <PostGallery
            paths={imagePaths}
            onOpen={(i) => setLightboxIndex(i)}
          />
          {lightboxIndex !== null && (
            <ImageLightbox
              images={imagePaths.map(postImageUrl)}
              startIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
        </>
      )}

      <PostInteractions
        postId={post.id}
        postContent={post.content}
        postAuthorName={displayName}
        reactions={post.reactions || []}
        comments={post.comments || []}
        isLoggedIn={!!user}
        currentUserId={user?.id ?? null}
        viewerRole={viewerRole}
        bookmarked={(post.bookmarks?.length ?? 0) > 0}
        onCommentDeleted={
          onCommentDeleted
            ? (commentId) => onCommentDeleted(post.id, commentId)
            : undefined
        }
        onReactionChange={onReactionChange}
      />

      {isReporting && (
        <ReportDialog
          targetType="post"
          targetId={post.id}
          onClose={() => setIsReporting(false)}
        />
      )}
    </article>
  );
}
