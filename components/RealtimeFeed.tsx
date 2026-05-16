"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { Comment, Post, PostWithRelations } from "@/utils/types";
import type { ReactionEmoji } from "@/utils/reactions";
import type { PostCategory } from "@/utils/categories";
import { FEED_PAGE_SIZE } from "@/utils/feed";
import { loadMorePosts } from "@/app/actions";
import PostCard from "./PostCard";

export default function RealtimeFeed({
  initialPosts,
  user,
  activeCategory,
  feedScope,
  followingIds,
}: {
  initialPosts: PostWithRelations[];
  user: User | null;
  activeCategory: PostCategory | null;
  feedScope: "seguindo" | null;
  followingIds: string[] | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(
    initialPosts.length === FEED_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Ref evita re-subscrever o canal a cada render (followingIds é novo array)
  const followingIdsRef = useRef(followingIds);
  useEffect(() => {
    followingIdsRef.current = followingIds;
  });
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("mural_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newPost = payload.new as Post;
          // Feed "Seguindo": só inserts de quem o usuário segue
          if (
            feedScope === "seguindo" &&
            !followingIdsRef.current?.includes(newPost.user_id)
          )
            return;
          // Filtro de categoria ativo: ignora inserts de outra seção
          if (activeCategory && newPost.category !== activeCategory) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, avatar_seed")
            .eq("id", newPost.user_id)
            .single();
          setPosts((prev) => [
            { ...newPost, profiles: profile, reactions: [], comments: [] },
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
          setPosts((prev) =>
            prev.map((post) =>
              post.id === newReaction.post_id
                ? {
                    ...post,
                    reactions: [
                      ...post.reactions,
                      {
                        user_id: newReaction.user_id,
                        emoji: newReaction.emoji,
                      },
                    ],
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
          setPosts((prev) =>
            prev.map((post) =>
              post.id === updated.post_id
                ? {
                    ...post,
                    reactions: post.reactions.map((r) =>
                      r.user_id === updated.user_id
                        ? { ...r, emoji: updated.emoji! }
                        : r,
                    ),
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
          setPosts((prev) =>
            prev.map((post) =>
              post.id === oldReaction.post_id
                ? {
                    ...post,
                    reactions: post.reactions.filter(
                      (r) => r.user_id !== oldReaction.user_id,
                    ),
                  }
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
  }, [supabase, activeCategory, feedScope]);

  const handleCommentDeleted = useCallback(
    (postId: number, commentId: number) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter((c) => c.id !== commentId),
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
    const next = await loadMorePosts(cursor, activeCategory, feedScope);
    setPosts((prev) => [...prev, ...next]);
    if (next.length < FEED_PAGE_SIZE) setHasMore(false);
    setIsLoading(false);
  }, [isLoading, hasMore, posts, activeCategory, feedScope]);

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

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <PostCard
          key={post.id}
          post={post}
          user={user}
          bgClass={index % 2 === 0 ? "bg-white" : "bg-mural-green"}
          onCommentDeleted={handleCommentDeleted}
        />
      ))}

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center gap-2 p-4 text-xs italic opacity-60"
        >
          {isLoading ? (
            <>
              <span
                aria-hidden
                className="w-3 h-3 border-2 border-mural-dark border-t-transparent rounded-full animate-spin"
              />
              Carregando mais recados...
            </>
          ) : (
            "..."
          )}
        </div>
      )}

      {!hasMore && posts.length >= FEED_PAGE_SIZE && (
        <div className="text-center p-4 text-xs italic opacity-40">
          🌳 Fim do mural por enquanto.
        </div>
      )}
    </div>
  );
}
