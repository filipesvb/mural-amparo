"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import type { PostWithRelations } from "@/utils/types";
import { EDIT_WINDOW_MS } from "@/utils/feed";
import { deletePost, editPost } from "@/app/actions";
import { PostInteractions } from "./Interactions";
import { RenderWithMentions } from "./MentionsProvider";
import MentionInput from "./MentionInput";

export default function PostCard({
  post,
  user,
  bgClass,
  onCommentDeleted,
}: {
  post: PostWithRelations;
  user: User | null;
  bgClass: string;
  onCommentDeleted?: (postId: number, commentId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isLiked = post.likes?.some((like) => like.user_id === user?.id);
  const displayName = post.profiles?.nickname || post.author_name;
  const avatarSeed = (
    post.profiles?.avatar_seed || post.author_name
  ).trim();

  const authorHref = post.profiles?.nickname
    ? `/perfil/${encodeURIComponent(post.profiles.nickname)}`
    : null;

  const isOwner = !!user && user.id === post.user_id;
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
    <div className="w-10 h-10 bg-mural-brown retro-border overflow-hidden">
      <Image
        src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(avatarSeed)}`}
        alt="avatar"
        width={40}
        height={40}
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
    if (!confirm("Excluir esse recado? Essa ação não pode ser desfeita.")) {
      return;
    }
    startDeleteTransition(async () => {
      await deletePost(post.id);
    });
  }

  return (
    <article className={`p-4 retro-border ${bgClass}`}>
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex gap-2 items-center">
          {authorHref ? (
            <Link href={authorHref} className="shrink-0">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div>
            <p className="font-bold">
              {authorHref ? (
                <Link href={authorHref} className="hover:underline">
                  {displayName}
                </Link>
              ) : (
                displayName
              )}
            </p>
            <p className="text-[10px] opacity-60">
              {new Date(post.created_at).toLocaleDateString("pt-BR")} às{" "}
              {new Date(post.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {isOwner && !isEditing && (
          <div className="flex gap-1 text-[10px] font-bold shrink-0">
            {withinEditWindow && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 bg-mural-creme retro-border hover:bg-white"
                disabled={isDeleting}
              >
                ✏️ Editar
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 bg-red-100 border-2 border-red-800 text-red-800 hover:bg-red-200 disabled:opacity-50"
            >
              {isDeleting ? "..." : "🗑️ Excluir"}
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
            className="w-full p-2 bg-mural-creme border-2 border-mural-dark text-sm focus:outline-none"
          />
          {editError && (
            <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
              ⚠️ {editError}
            </div>
          )}
          <div className="flex gap-2 text-xs font-bold">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-mural-brown text-white px-3 py-1 retro-border disabled:opacity-50"
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
              className="bg-mural-creme px-3 py-1 retro-border"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">
          <RenderWithMentions text={post.content} />
        </p>
      )}

      <PostInteractions
        postId={post.id}
        likesCount={post.likes?.length || 0}
        comments={post.comments || []}
        isLiked={!!isLiked}
        isLoggedIn={!!user}
        currentUserId={user?.id ?? null}
        onCommentDeleted={
          onCommentDeleted
            ? (commentId) => onCommentDeleted(post.id, commentId)
            : undefined
        }
      />
    </article>
  );
}
