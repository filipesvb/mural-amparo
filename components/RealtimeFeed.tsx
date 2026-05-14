"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { Comment, Post, PostWithRelations } from "@/utils/types";
import { PostInteractions } from "./Interactions";

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
      {posts.map((post, index) => {
        const isLiked = post.likes?.some(
          (like) => like.user_id === user?.id,
        );

        return (
          /* AQUI: Roubamos o estilo exato do seu código antigo */
          <article
            key={post.id}
            className={`p-4 retro-border ${index % 2 === 0 ? "bg-white" : "bg-mural-green"}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2 items-center">
                {/* Estilo do Avatar original */}
                <div className="w-10 h-10 bg-mural-brown retro-border overflow-hidden">
                  <Image
                    src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent((post.profiles?.avatar_seed || post.author_name).trim())}`}
                    alt="avatar"
                    width={40}
                    height={40}
                  />
                </div>
                <div>
                  {/* Nome e Data com as fontes e cores originais */}
                  <p className="font-bold">
                    {post.profiles?.nickname || post.author_name}
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
            </div>

            {/* Texto do recado com o leading-relaxed original */}
            <p className="text-sm leading-relaxed mb-4">{post.content}</p>

            {/* Mantemos as interações integradas ao estilo */}
            <PostInteractions
              postId={post.id}
              likesCount={post.likes?.length || 0}
              comments={post.comments || []}
              isLiked={isLiked}
              isLoggedIn={!!user}
            />
          </article>
        );
      })}
    </div>
  );
}
