"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import type { PostWithRelations } from "@/utils/types";
import { EDIT_WINDOW_MS } from "@/utils/feed";
import { postImageUrl } from "@/utils/storage";
import { categoryMeta } from "@/utils/categories";
import type { ReactionEmoji } from "@/utils/reactions";
import { canModerate, type Role } from "@/utils/roles";
import { deletePost, editPost } from "@/app/actions";
import Avatar from "./Avatar";
import PostGallery from "./PostGallery";
import ImageLightbox from "./ImageLightbox";
import RoleBadge from "./RoleBadge";
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

  async function handleEditSubmit(formData: FormData) {
    setEditError("");
    startSaveTransition(async () => {
      const result = await editPost(formData);
      if (result?.error) {
        setEditError(result.error);
        return;
      }
      setIsEditing(false);
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

        {canDelete && !isEditing && (
          <div className="flex gap-1 text-[10px] font-bold shrink-0">
            {isOwner && withinEditWindow && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 rounded-lg text-mural-ink/60 hover:bg-mural-creme"
                disabled={isDeleting}
              >
                ✏️ Editar
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title={
                isOwner ? "Excluir recado" : "Excluir como moderador"
              }
              className="px-2 py-1 rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "..." : "🗑️"}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form action={handleEditSubmit} className="mb-4 space-y-2">
          <input type="hidden" name="post_id" value={post.id} />
          <MentionInput
            as="textarea"
            name="content"
            defaultValue={post.content}
            required
            rows={3}
            className="w-full p-2 bg-mural-creme border border-mural-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
          />
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
              onClick={() => {
                setIsEditing(false);
                setEditError("");
              }}
              disabled={isSaving}
              className="bg-mural-creme border border-mural-line px-4 py-1.5 rounded-lg"
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

      {imagePaths.length > 0 && (
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
    </article>
  );
}
