"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { Comment, Post, PostWithRelations } from "@/utils/types";
import { FEED_PAGE_SIZE } from "@/utils/feed";
import { loadMorePosts } from "@/app/actions";
import PostCard from "./PostCard";

export default function RealtimeFeed({
  initialPosts,
  user,
}: {
  initialPosts: PostWithRelations[];
  user: User | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(
    initialPosts.length === FEED_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("mural_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newPost = payload.new as Post;
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, avatar_seed")
            .eq("id", newPost.user_id)
            .single();
          setPosts((prev) => [
            { ...newPost, profiles: profile, likes: [], comments: [] },
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
        { event: "INSERT", schema: "public", table: "likes" },
        (payload) => {
          const newLike = payload.new as { post_id: number; user_id: string };
          setPosts((prev) =>
            prev.map((post) =>
              post.id === newLike.post_id
                ? {
                    ...post,
                    likes: [...post.likes, { user_id: newLike.user_id }],
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
      // DELETE em likes/comments não dispara update local: o payload.old
      // só carrega o primary key sem REPLICA IDENTITY FULL no Postgres.
      // Esses eventos só refletem após reload.
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchMore = useCallback(async () => {
    if (isLoading || !hasMore || posts.length === 0) return;
    setIsLoading(true);
    const cursor = posts[posts.length - 1].created_at;
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

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <PostCard
          key={post.id}
          post={post}
          user={user}
          bgClass={index % 2 === 0 ? "bg-white" : "bg-mural-green"}
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
