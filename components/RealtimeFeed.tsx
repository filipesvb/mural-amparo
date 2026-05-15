"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { Comment, Post, PostWithRelations } from "@/utils/types";
import PostCard from "./PostCard";

export default function RealtimeFeed({
  initialPosts,
  user,
}: {
  initialPosts: PostWithRelations[];
  user: User | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
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
    </div>
  );
}
