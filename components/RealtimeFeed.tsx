"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PostInteractions } from "./Interactions";

export default function RealtimeFeed({
  initialPosts,
  user,
}: {
  initialPosts: any[];
  user: any;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const supabase = createClient();

  // Função para buscar dados completos de um post (incluindo o perfil para o estilo não quebrar)
  const fetchSinglePost = async (postId: number) => {
    const { data } = await supabase
      .from("posts")
      .select(
        "*, profiles (nickname, avatar_seed), likes (user_id), comments (*)",
      )
      .eq("id", postId)
      .single();
    return data;
  };

  useEffect(() => {
    const channel = supabase
      .channel("mural_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newPost = await fetchSinglePost(payload.new.id);
            if (newPost) setPosts((prev) => [newPost, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setPosts((prev) =>
              prev.filter((post) => post.id !== payload.old.id),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        async (payload: any) => {
          const targetId = payload.new?.post_id || payload.old?.post_id;
          if (targetId) {
            const updatedPost = await fetchSinglePost(targetId);
            if (updatedPost) {
              setPosts((prev) =>
                prev.map((p) => (p.id === targetId ? updatedPost : p)),
              );
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        async (payload: any) => {
          const targetId = payload.new?.post_id || payload.old?.post_id;
          if (targetId) {
            const updatedPost = await fetchSinglePost(targetId);
            if (updatedPost) {
              setPosts((prev) =>
                prev.map((p) => (p.id === targetId ? updatedPost : p)),
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      {posts.map((post, index) => {
        const isLiked = post.likes?.some(
          (like: any) => like.user_id === user?.id,
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
                  <img
                    src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.profiles?.avatar_seed || post.author_name}`}
                    alt="avatar"
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
