"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { PostWithRelations } from "@/utils/types";
import { PostInteractions } from "./Interactions";

export default function PostCard({
  post,
  user,
  bgClass,
}: {
  post: PostWithRelations;
  user: User | null;
  bgClass: string;
}) {
  const isLiked = post.likes?.some((like) => like.user_id === user?.id);
  const displayName = post.profiles?.nickname || post.author_name;
  const avatarSeed = (
    post.profiles?.avatar_seed || post.author_name
  ).trim();

  const authorHref = post.profiles?.nickname
    ? `/perfil/${encodeURIComponent(post.profiles.nickname)}`
    : null;

  const avatar = (
    <div className="w-10 h-10 bg-mural-brown retro-border overflow-hidden">
      <Image
        src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(avatarSeed)}`}
        alt="avatar"
        width={40}
        height={40}
      />
    </div>
  );

  return (
    <article className={`p-4 retro-border ${bgClass}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 items-center">
          {authorHref ? (
            <Link href={authorHref} className="shrink-0">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div>
            <p className="font-bold">
              {authorHref ? (
                <Link href={authorHref} className="hover:underline">
                  {displayName}
                </Link>
              ) : (
                displayName
              )}
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

      <p className="text-sm leading-relaxed mb-4">{post.content}</p>

      <PostInteractions
        postId={post.id}
        likesCount={post.likes?.length || 0}
        comments={post.comments || []}
        isLiked={!!isLiked}
        isLoggedIn={!!user}
      />
    </article>
  );
}
