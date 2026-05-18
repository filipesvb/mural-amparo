"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { Comment, Post, PostWithRelations } from "@/utils/types";
import {
  applyReactionToggle,
  removeReactionFor,
  setReactionFor,
  type ReactionEmoji,
} from "@/utils/reactions";
import { FEED_PAGE_SIZE } from "@/utils/feed";
import type { Role } from "@/utils/roles";
import { loadMorePosts } from "@/app/actions";
import { useFeedFilter } from "./FeedFilterProvider";
import PostCard from "./PostCard";

export default function RealtimeFeed({
  initialPosts,
  user,
  viewerRole,
  followingIds,
}: {
  initialPosts: PostWithRelations[];
  user: User | null;
  viewerRole?: Role | null;
  followingIds: string[] | null;
}) {
  const { category, feed, isPending } = useFeedFilter();
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(
    initialPosts.length === FEED_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  const followingSet = useMemo(
    () => (followingIds ? new Set(followingIds) : null),
    [followingIds],
  );

  // Filtro 100% client-side: troca de categoria/escopo é instantânea,
  // sem ida ao servidor (o estado já tem o feed público carregado).
  const visiblePosts = useMemo(
    () =>
      posts.filter((p) => {
        if (category && p.category !== category) return false;
        if (feed === "seguindo" && !followingSet?.has(p.user_id)) return false;
        return true;
      }),
    [posts, category, feed, followingSet],
  );

  useEffect(() => {
    const channel = supabase
      .channel("mural_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newPost = payload.new as Post;
          // Sem early-return por filtro: guardamos todo o feed público e
          // o filtro de exibição cuida de categoria/escopo.
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, avatar_seed, avatar_path, role")
            .eq("id", newPost.user_id)
            .single();
          setPosts((prev) => [
            {
              ...newPost,
              // Realtime pode entregar array nulo/ausente; normaliza p/ [].
              image_paths: newPost.image_paths ?? [],
              profiles: profile,
              reactions: [],
              comments: [],
              // Recado recém-criado: ninguém salvou ainda.
              bookmarks: [],
            },
            ...prev,
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const oldRow = payload.old as Partial<{ id: number }>;
          if (oldRow.id) {
            setPosts((prev) =>
              prev.filter((post) => post.id !== oldRow.id),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const newReaction = payload.new as {
            post_id: number;
            user_id: string;
            emoji: ReactionEmoji;
          };
          // Idempotente: se a ação local já aplicou, o eco vira no-op.
          setPosts((prev) =>
            prev.map((post) =>
              post.id === newReaction.post_id
                ? {
                    ...post,
                    reactions: setReactionFor(
                      post.reactions,
                      newReaction.user_id,
                      newReaction.emoji,
                    ),
                  }
                : post,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reactions" },
        (payload) => {
          // Troca de emoji: requer `replica identity full` para payload.new
          // trazer post_id+user_id+emoji (default só carrega a PK).
          const updated = payload.new as Partial<{
            post_id: number;
            user_id: string;
            emoji: ReactionEmoji;
          }>;
          if (!updated.post_id || !updated.user_id || !updated.emoji) return;
          const uid = updated.user_id;
          const em = updated.emoji;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === updated.post_id
                ? {
                    ...post,
                    reactions: setReactionFor(post.reactions, uid, em),
                  }
                : post,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => {
          // Requer `alter table reactions replica identity full` no Postgres
          // para que payload.old traga post_id e user_id (default só carrega PK).
          const oldReaction = payload.old as Partial<{
            post_id: number;
            user_id: string;
          }>;
          if (!oldReaction.post_id || !oldReaction.user_id) return;
          const uid = oldReaction.user_id;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === oldReaction.post_id
                ? { ...post, reactions: removeReactionFor(post.reactions, uid) }
                : post,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const newComment = payload.new as Comment;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === newComment.post_id
                ? { ...post, comments: [...post.comments, newComment] }
                : post,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updated = payload.new as Post;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === updated.id
                ? { ...post, content: updated.content }
                : post,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "comments" },
        (payload) => {
          const updated = payload.new as Comment;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === updated.post_id
                ? {
                    ...post,
                    comments: post.comments.map((c) =>
                      c.id === updated.id ? updated : c,
                    ),
                  }
                : post,
            ),
          );
        },
      )
      // DELETE em comments só vem com PK no payload.old (replica identity default).
      // O cliente que apaga atualiza estado local via callback (onCommentDeleted).
      // Outros clientes só veem após reload. Para reactions, mudamos replica
      // identity pra FULL no Postgres, então UPDATE/DELETE acima valem pra todos.
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleCommentDeleted = useCallback(
    (postId: number, commentId: number) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                // Remove o comentário e, se for raiz, suas respostas
                // (no banco isso cai por on delete cascade)
                comments: post.comments.filter(
                  (c) =>
                    c.id !== commentId &&
                    c.parent_comment_id !== commentId,
                ),
              }
            : post,
        ),
      );
    },
    [],
  );

  // Reação do próprio usuário: aplica já no estado autoritativo (não
  // dependemos do eco do Realtime, que para DELETE pode não chegar).
  const handleReactionChange = useCallback(
    (postId: number, userId: string, emoji: ReactionEmoji) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                reactions: applyReactionToggle(post.reactions, userId, emoji),
              }
            : post,
        ),
      );
    },
    [],
  );

  const fetchMore = useCallback(async () => {
    if (isLoading || !hasMore || posts.length === 0) return;
    setIsLoading(true);
    const cursor = posts[posts.length - 1].created_at;
    // Sempre pagina o feed público completo; o filtro é em memória.
    const next = await loadMorePosts(cursor);
    setPosts((prev) => [...prev, ...next]);
    if (next.length < FEED_PAGE_SIZE) setHasMore(false);
    setIsLoading(false);
  }, [isLoading, hasMore, posts]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, fetchMore]);

  const emptyMessage =
    feed === "seguindo"
      ? (followingIds?.length ?? 0) === 0
        ? "Você ainda não segue ninguém. Explore o feed público e siga moradores."
        : "Ninguém que você segue publicou recados ainda."
      : category
        ? "Nenhum recado nesta categoria ainda."
        : "Nenhum recado por aqui ainda... Seja o primeiro!";

  return (
    <div
      className={`space-y-4 transition-opacity duration-200 ${
        isPending ? "opacity-40" : "opacity-100"
      }`}
    >
      {visiblePosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          user={user}
          viewerRole={viewerRole}
          onCommentDeleted={handleCommentDeleted}
          onReactionChange={handleReactionChange}
        />
      ))}

      {/* Lista vazia: se ainda há páginas, mostramos o loader (pode haver
          itens da categoria mais pra trás); senão, a mensagem de vazio. */}
      {visiblePosts.length === 0 && !hasMore && (
        <div className="text-center p-8 text-mural-ink/40 italic">
          {emptyMessage}
        </div>
      )}

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center gap-2 p-4 text-xs italic opacity-60"
        >
          {isLoading || visiblePosts.length === 0 ? (
            <>
              <span
                aria-hidden
                className="w-3 h-3 border-2 border-mural-dark border-t-transparent rounded-full animate-spin"
              />
              {visiblePosts.length === 0
                ? "Procurando recados..."
                : "Carregando mais recados..."}
            </>
          ) : (
            "..."
          )}
        </div>
      )}

      {!hasMore && visiblePosts.length >= FEED_PAGE_SIZE && (
        <div className="text-center p-4 text-xs italic opacity-40">
          🌳 Fim do mural por enquanto.
        </div>
      )}
    </div>
  );
}
