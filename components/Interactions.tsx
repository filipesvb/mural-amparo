"use client";

import { toggleLike, addComment } from "@/app/actions";
import { useState, useTransition } from "react"; // Adicionado useTransition

export function PostInteractions({
  postId,
  likesCount,
  comments,
  isLiked,
  isLoggedIn,
}: {
  postId: number;
  likesCount: number;
  comments: any[];
  isLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [showComments, setShowComments] = useState(false);

  // O hook useTransition gerencia o estado de carregamento da Action
  const [isLikePending, startLikeTransition] = useTransition();

  return (
    <div className="mt-4 pt-3 border-t border-mural-dark/10">
      <div className="flex gap-4 text-xs font-bold">
        <button
          onClick={() => {
            if (isLoggedIn) {
              // Envolvemos a chamada na transição
              startLikeTransition(() => toggleLike(postId));
            }
          }}
          // Mudamos a cara do botão se estiver processando
          className={`
            flex items-center gap-1 transition-all
            ${isLikePending ? "opacity-30 scale-95 cursor-wait" : "retro-button-active"}
            ${isLiked ? "text-red-600" : "opacity-60"}
          `}
          disabled={!isLoggedIn || isLikePending}
        >
          {/* Se estiver processando, mostra um ícone de "pensando" */}
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
            <div
              key={comment.id}
              className="text-xs border-b border-mural-dark/5 pb-2"
            >
              <span className="font-bold text-mural-brown">
                {comment.author_name}:
              </span>{" "}
              {comment.content}
            </div>
          ))}

          {isLoggedIn ? (
            <form action={addComment} className="flex gap-2 mt-2">
              <input type="hidden" name="post_id" value={postId} />
              <input
                name="content"
                placeholder="Escreva um comentário..."
                className="flex-1 p-1 text-[10px] bg-white border border-mural-dark focus:outline-none"
              />
              <button className="bg-mural-dark text-white px-2 py-1 text-[10px] font-bold">
                Enviar
              </button>
            </form>
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
