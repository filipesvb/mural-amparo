"use client";

import {
  setReaction,
  addComment,
  editComment,
  deleteComment,
} from "@/app/actions";
import { useEffect, useState, useTransition } from "react";
import type { Comment, Reaction } from "@/utils/types";
import { REACTION_EMOJIS } from "@/utils/reactions";
import { EDIT_WINDOW_MS } from "@/utils/feed";
import { RenderWithMentions } from "./MentionsProvider";
import MentionInput from "./MentionInput";

export function PostInteractions({
  postId,
  reactions,
  comments,
  isLoggedIn,
  currentUserId,
  onCommentDeleted,
}: {
  postId: number;
  reactions: Pick<Reaction, "user_id" | "emoji">[];
  comments: Comment[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  onCommentDeleted?: (commentId: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [isReactPending, startReactTransition] = useTransition();

  const myReaction = currentUserId
    ? (reactions.find((r) => r.user_id === currentUserId)?.emoji ?? null)
    : null;

  return (
    <div className="mt-4 pt-3 border-t border-mural-dark/10">
      <div className="flex flex-wrap gap-1 text-xs font-bold items-center">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactions.filter((r) => r.emoji === emoji).length;
          const mine = myReaction === emoji;
          return (
            <button
              key={emoji}
              onClick={() => {
                if (isLoggedIn) {
                  startReactTransition(() => setReaction(postId, emoji));
                }
              }}
              disabled={!isLoggedIn || isReactPending}
              title={
                isLoggedIn
                  ? mine
                    ? "Remover sua reação"
                    : "Reagir"
                  : "Entre para reagir"
              }
              className={`
                flex items-center gap-1 px-2 py-1 transition-all
                ${isReactPending ? "opacity-30 cursor-wait" : "retro-button-active"}
                ${mine ? "retro-border bg-mural-creme" : "opacity-50 hover:opacity-100"}
              `}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}

        <button
          onClick={() => setShowComments(!showComments)}
          className="opacity-60 hover:underline flex items-center gap-1 px-2 py-1"
        >
          💬 {comments.length} Comentários
        </button>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 bg-mural-creme/50 p-3 retro-border">
          {(() => {
            const topLevel = comments.filter(
              (c) => c.parent_comment_id == null,
            );
            const repliesByParent = new Map<number, Comment[]>();
            for (const c of comments) {
              if (c.parent_comment_id == null) continue;
              const list = repliesByParent.get(c.parent_comment_id) ?? [];
              list.push(c);
              repliesByParent.set(c.parent_comment_id, list);
            }
            return topLevel.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={repliesByParent.get(comment.id) ?? []}
                postId={postId}
                currentUserId={currentUserId}
                isLoggedIn={isLoggedIn}
                onDeleted={onCommentDeleted}
              />
            ));
          })()}

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

function CommentThread({
  comment,
  replies,
  postId,
  currentUserId,
  isLoggedIn,
  onDeleted,
}: {
  comment: Comment;
  replies: Comment[];
  postId: number;
  currentUserId: string | null;
  isLoggedIn: boolean;
  onDeleted?: (commentId: number) => void;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [isSending, startSendTransition] = useTransition();

  function handleReplySubmit(formData: FormData) {
    setReplyError("");
    startSendTransition(async () => {
      const result = await addComment(formData);
      if (result?.error) {
        setReplyError(result.error);
        return;
      }
      setIsReplying(false);
    });
  }

  return (
    <div>
      <CommentRow
        comment={comment}
        currentUserId={currentUserId}
        onDeleted={onDeleted}
      />

      {(replies.length > 0 || isReplying) && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-mural-dark/15 space-y-2">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onDeleted={onDeleted}
            />
          ))}

          {isReplying && (
            <>
              <form action={handleReplySubmit} className="flex gap-2">
                <input type="hidden" name="post_id" value={postId} />
                <input
                  type="hidden"
                  name="parent_comment_id"
                  value={comment.id}
                />
                <div className="flex-1">
                  <MentionInput
                    as="input"
                    name="content"
                    required
                    placeholder="Escreva uma resposta... use @ para mencionar"
                    className="w-full p-1 text-[10px] bg-white border border-mural-dark focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-mural-dark text-white px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                >
                  {isSending ? "..." : "Responder"}
                </button>
              </form>
              {replyError && (
                <p className="text-[10px] text-red-700 italic">
                  ⚠️ {replyError}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {isLoggedIn && (
        <button
          onClick={() => setIsReplying((v) => !v)}
          className="mt-1 text-[10px] font-bold opacity-60 hover:opacity-100 hover:underline"
        >
          {isReplying ? "Cancelar" : "↩︎ Responder"}
        </button>
      )}
    </div>
  );
}
