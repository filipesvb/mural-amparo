"use client";

import {
  toggleLike,
  addComment,
  editComment,
  deleteComment,
} from "@/app/actions";
import { useEffect, useState, useTransition } from "react";
import type { Comment } from "@/utils/types";
import { EDIT_WINDOW_MS } from "@/utils/feed";
import { RenderWithMentions } from "./MentionsProvider";
import MentionInput from "./MentionInput";

export function PostInteractions({
  postId,
  likesCount,
  comments,
  isLiked,
  isLoggedIn,
  currentUserId,
  onCommentDeleted,
}: {
  postId: number;
  likesCount: number;
  comments: Comment[];
  isLiked: boolean;
  isLoggedIn: boolean;
  currentUserId: string | null;
  onCommentDeleted?: (commentId: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [isLikePending, startLikeTransition] = useTransition();

  return (
    <div className="mt-4 pt-3 border-t border-mural-dark/10">
      <div className="flex gap-4 text-xs font-bold">
        <button
          onClick={() => {
            if (isLoggedIn) {
              startLikeTransition(() => toggleLike(postId));
            }
          }}
          className={`
            flex items-center gap-1 transition-all
            ${isLikePending ? "opacity-30 scale-95 cursor-wait" : "retro-button-active"}
            ${isLiked ? "text-red-600" : "opacity-60"}
          `}
          disabled={!isLoggedIn || isLikePending}
        >
          {isLikePending ? "⏳" : isLiked ? "❤️" : "🤍"} {likesCount} Curtidas
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="opacity-60 hover:underline flex items-center gap-1"
        >
          💬 {comments.length} Comentários
        </button>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 bg-mural-creme/50 p-3 retro-border">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onDeleted={onCommentDeleted}
            />
          ))}

          {isLoggedIn ? (
            <>
              <form
                action={async (formData) => {
                  setCommentError("");
                  const result = await addComment(formData);
                  if (result?.error) setCommentError(result.error);
                }}
                className="flex gap-2 mt-2"
              >
                <input type="hidden" name="post_id" value={postId} />
                <div className="flex-1">
                  <MentionInput
                    as="input"
                    name="content"
                    required
                    placeholder="Escreva um comentário... use @ para mencionar"
                    className="w-full p-1 text-[10px] bg-white border border-mural-dark focus:outline-none"
                  />
                </div>
                <button className="bg-mural-dark text-white px-2 py-1 text-[10px] font-bold">
                  Enviar
                </button>
              </form>
              {commentError && (
                <p className="text-[10px] text-red-700 italic mt-1">
                  ⚠️ {commentError}
                </p>
              )}
            </>
          ) : (
            <p className="text-[10px] italic opacity-50 text-center">
              Faça login para comentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  currentUserId,
  onDeleted,
}: {
  comment: Comment;
  currentUserId: string | null;
  onDeleted?: (commentId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isOwner = !!currentUserId && currentUserId === comment.user_id;
  const createdAtMs = new Date(comment.created_at).getTime();
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

  async function handleEditSubmit(formData: FormData) {
    setEditError("");
    startSaveTransition(async () => {
      const result = await editComment(formData);
      if (result?.error) {
        setEditError(result.error);
        return;
      }
      setIsEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm("Excluir esse comentário?")) return;
    startDeleteTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result?.error) return;
      onDeleted?.(comment.id);
    });
  }

  return (
    <div className="text-xs border-b border-mural-dark/5 pb-2">
      {isEditing ? (
        <form action={handleEditSubmit} className="space-y-1">
          <input type="hidden" name="comment_id" value={comment.id} />
          <MentionInput
            as="input"
            name="content"
            defaultValue={comment.content}
            required
            className="w-full p-1 text-[10px] bg-white border border-mural-dark focus:outline-none"
          />
          {editError && (
            <p className="text-[10px] text-red-700 italic">⚠️ {editError}</p>
          )}
          <div className="flex gap-2 text-[10px] font-bold">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-mural-dark text-white px-2 py-0.5 disabled:opacity-50"
            >
              {isSaving ? "..." : "Salvar"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsEditing(false);
                setEditError("");
              }}
              className="bg-mural-creme px-2 py-0.5 border border-mural-dark"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-between items-start gap-2">
          <p className={isDeleting ? "opacity-40" : ""}>
            <span className="font-bold text-mural-brown">
              {comment.author_name}:
            </span>{" "}
            <RenderWithMentions text={comment.content} />
          </p>
          {isOwner && (
            <div className="flex gap-1 text-[9px] font-bold shrink-0">
              {withinEditWindow && (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={isDeleting}
                  className="opacity-60 hover:opacity-100 hover:underline"
                >
                  ✏️
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-700 hover:underline disabled:opacity-50"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
