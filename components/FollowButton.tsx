"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions";

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
}: {
  targetUserId: string;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const previous = isFollowing;
    setIsFollowing(!previous); // otimista
    startTransition(async () => {
      const result = await toggleFollow(targetUserId);
      if (result?.error) {
        setIsFollowing(previous); // reverte
        return;
      }
      router.refresh(); // atualiza contadores no server
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-4 py-2 text-sm font-bold retro-border retro-button-active shrink-0 disabled:opacity-50 ${
        isFollowing
          ? "bg-mural-creme text-mural-dark"
          : "bg-mural-brown text-white"
      }`}
    >
      {isFollowing ? "✓ Seguindo" : "+ Seguir"}
    </button>
  );
}
