"use client";

import {
  setReaction,
  addComment,
  editComment,
  deleteComment,
  toggleBookmark,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import type { Comment, Reaction } from "@/utils/types";
import type { ReactionEmoji } from "@/utils/reactions";
import { REACTION_EMOJIS } from "@/utils/reactions";
import { canModerate, type Role } from "@/utils/roles";
import { EDIT_WINDOW_MS } from "@/utils/feed";
import { RenderWithMentions } from "./MentionsProvider";
import MentionInput from "./MentionInput";
import HoneypotField from "./HoneypotField";

// Comentário temporário (id negativo evita colisão de key) exibido na hora;
// é descartado quando o comentário real chega via Realtime.
function makeOptimisticComment(
  postId: number,
  currentUserId: string | null,
  content: string,
  parentId: number | null,
): Comment {
  return {
    id: -Date.now(),
    post_id: postId,
    user_id: currentUserId ?? "",
    content,
    author_name: "Você",
    created_at: new Date().toISOString(),
    parent_comment_id: parentId,
  };
}

export function PostInteractions({
  postId,
  reactions,
  comments,
  isLoggedIn,
  currentUserId,
  viewerRole,
  bookmarked,
  onCommentDeleted,
  onReactionChange,
}: {
  postId: number;
  reactions: Pick<Reaction, "user_id" | "emoji">[];
  comments: Comment[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  viewerRole?: Role | null;
  bookmarked: boolean;
  onCommentDeleted?: (commentId: number) => void;
  onReactionChange?: (
    postId: number,
    userId: string,
    emoji: ReactionEmoji,
  ) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [, startReactTransition] = useTransition();
  const router = useRouter();

  // Bookmark é por-usuário e privado: não vem por Realtime, então o estado
  // é local e otimista (revertido se a action falhar).
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  const [, startBookmarkTransition] = useTransition();

  function handleBookmark() {
    if (!isLoggedIn) return;
    const previous = isBookmarked;
    setIsBookmarked(!previous); // otimista
    startBookmarkTransition(async () => {
      const result = await toggleBookmark(postId);
      if (result?.error) {
        setIsBookmarked(previous); // reverte
        return;
      }
      // Reflete a remoção em /perfil/salvos; no feed é barato (estado client).
      router.refresh();
    });
  }

  // Reação não usa useOptimistic: a mudança é aplicada direto no estado
  // autoritativo do feed (onReactionChange) e persistida em background.
  // Assim não há "reverter pro base e esperar o eco do Realtime" — que
  // era o que causava o pisca-pisca (e o não-sumir ao remover).
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state: Comment[], c: Comment) => [...state, c],
  );

  const myReaction = currentUserId
    ? (reactions.find((r) => r.user_id === currentUserId)?.emoji ?? null)
    : null;


  return (
    <div className="mt-4 pt-3 border-t border-mural-line">
      <div className="flex flex-wrap gap-1.5 text-xs font-bold items-center">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactions.filter((r) => r.emoji === emoji).length;
          const mine = myReaction === emoji;
          return (
            <button
              key={emoji}
              onClick={() => {
                if (!isLoggedIn || !currentUserId) return;
                // Aplica já no estado autoritativo (instantâneo, sem
                // flicker) e persiste em background.
                onReactionChange?.(postId, currentUserId, emoji);
                startReactTransition(() => {
                  setReaction(postId, emoji);
                });
              }}
              disabled={!isLoggedIn}
              title={
                isLoggedIn
                  ? mine
                    ? "Remover sua reação"
                    : "Reagir"
                  : "Entre para reagir"
              }
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
                mine
                  ? "bg-mural-brown/15 border-mural-brown text-mural-ink"
                  : "bg-mural-card border-mural-line text-mural-ink/55 hover:bg-mural-creme"
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleBookmark}
            disabled={!isLoggedIn}
            title={
              isLoggedIn
                ? isBookmarked
                  ? "Remover dos salvos"
                  : "Salvar recado"
                : "Entre para salvar"
            }
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
              isBookmarked
                ? "bg-mural-brown/15 border-mural-brown text-mural-ink"
                : "bg-mural-card border-mural-line text-mural-ink/55 hover:bg-mural-creme"
            }`}
          >
            <span>🔖</span>
            <span className="hidden sm:inline">
              {isBookmarked ? "Salvo" : "Salvar"}
            </span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="text-mural-ink/50 hover:text-mural-ink flex items-center gap-1 px-2 py-1"
          >
            💬 {optimisticComments.length}{" "}
            {optimisticComments.length === 1 ? "comentário" : "comentários"}
          </button>
        </div>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 bg-mural-creme/40 p-3 rounded-xl border border-mural-line">
          {(() => {
            const topLevel = optimisticComments.filter(
              (c) => c.parent_comment_id == null,
            );
            const repliesByParent = new Map<number, Comment[]>();
            for (const c of optimisticComments) {
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
                viewerRole={viewerRole}
                onDeleted={onCommentDeleted}
                onAddOptimistic={addOptimisticComment}
              />
            ));
          })()}

          {isLoggedIn ? (
            <>
              <form
                action={async (formData) => {
                  setCommentError("");
                  addOptimisticComment(
                    makeOptimisticComment(
                      postId,
                      currentUserId,
                      (formData.get("content") as string) ?? "",
                      null,
                    ),
                  );
                  const result = await addComment(formData);
                  if (result?.error) setCommentError(result.error);
                }}
                className="flex gap-2 mt-2"
              >
                <HoneypotField />
                <input type="hidden" name="post_id" value={postId} />
                <div className="flex-1">
                  <MentionInput
                    as="input"
                    name="content"
                    required
                    placeholder="Escreva um comentário... use @ para mencionar"
                    className="w-full px-2 py-1.5 text-[11px] bg-mural-card border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
                  />
                </div>
                <button className="bg-mural-brown text-white px-3 py-1.5 text-[11px] font-bold rounded-lg retro-button-active">
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
  viewerRole,
  onDeleted,
}: {
  comment: Comment;
  currentUserId: string | null;
  viewerRole?: Role | null;
  onDeleted?: (commentId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isOwner = !!currentUserId && currentUserId === comment.user_id;
  // Staff (moderador/admin) pode apagar comentário de qualquer um.
  const canMod = !!currentUserId && canModerate(viewerRole);
  const canDelete = isOwner || canMod;
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
    const msg = isOwner
      ? "Excluir esse comentário?"
      : "Excluir o comentário deste morador como moderador?";
    if (!confirm(msg)) return;
    startDeleteTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result?.error) return;
      onDeleted?.(comment.id);
    });
  }

  return (
    <div className="text-xs border-b border-mural-line/60 pb-2 last:border-0">
      {isEditing ? (
        <form action={handleEditSubmit} className="space-y-1">
          <input type="hidden" name="comment_id" value={comment.id} />
          <MentionInput
            as="input"
            name="content"
            defaultValue={comment.content}
            required
            className="w-full px-2 py-1.5 text-[11px] bg-mural-card border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
          />
          {editError && (
            <p className="text-[10px] text-red-700 italic">⚠️ {editError}</p>
          )}
          <div className="flex gap-2 text-[10px] font-bold">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-mural-brown text-white px-3 py-1 rounded-lg disabled:opacity-50"
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
              className="bg-mural-creme px-3 py-1 rounded-lg border border-mural-line"
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
          {canDelete && (
            <div className="flex gap-1 text-[9px] font-bold shrink-0">
              {isOwner && withinEditWindow && (
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
                title={isOwner ? "Excluir" : "Excluir como moderador"}
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
  viewerRole,
  onDeleted,
  onAddOptimistic,
}: {
  comment: Comment;
  replies: Comment[];
  postId: number;
  currentUserId: string | null;
  isLoggedIn: boolean;
  viewerRole?: Role | null;
  onDeleted?: (commentId: number) => void;
  onAddOptimistic: (comment: Comment) => void;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [isSending, startSendTransition] = useTransition();

  function handleReplySubmit(formData: FormData) {
    setReplyError("");
    startSendTransition(async () => {
      onAddOptimistic(
        makeOptimisticComment(
          postId,
          currentUserId,
          (formData.get("content") as string) ?? "",
          comment.id,
        ),
      );
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
        viewerRole={viewerRole}
        onDeleted={onDeleted}
      />

      {(replies.length > 0 || isReplying) && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-mural-line space-y-2">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              viewerRole={viewerRole}
              onDeleted={onDeleted}
            />
          ))}

          {isReplying && (
            <>
              <form action={handleReplySubmit} className="flex gap-2">
                <HoneypotField />
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
                    className="w-full px-2 py-1.5 text-[11px] bg-mural-card border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-mural-brown text-white px-3 py-1.5 text-[11px] font-bold rounded-lg disabled:opacity-50"
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
          className="mt-1 text-[10px] font-bold text-mural-ink/50 hover:text-mural-ink"
        >
          {isReplying ? "Cancelar" : "↩︎ Responder"}
        </button>
      )}
    </div>
  );
}
