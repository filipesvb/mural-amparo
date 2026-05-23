"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/actions";

export default function BlockUserButton({
  targetUserId,
  targetNickname,
  initialIsBlocked,
}: {
  targetUserId: string;
  targetNickname: string;
  initialIsBlocked: boolean;
}) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    setError("");
    if (isBlocked) {
      // Desbloquear é menos crítico, ainda assim confirmamos
      const ok = confirm(`Desbloquear ${targetNickname}?`);
      if (!ok) return;
    } else {
      const ok = confirm(
        `Bloquear ${targetNickname}?\n\n` +
          `Você não vai ver mais posts dessa pessoa no seu feed. ` +
          `Ela não é avisada do bloqueio.`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const result = isBlocked
        ? await unblockUser(targetUserId)
        : await blockUser(targetUserId);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsBlocked(!isBlocked);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          isBlocked
            ? "bg-mural-creme text-mural-dark border-2 border-mural-dark/40 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer hover:brightness-105 transition-all disabled:opacity-50"
            : "bg-red-50 text-red-900 border-2 border-red-800 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-50"
        }
        title={
          isBlocked
            ? `Desbloquear ${targetNickname}`
            : `Bloquear ${targetNickname}`
        }
      >
        {isPending
          ? "..."
          : isBlocked
            ? "🔓 Desbloquear"
            : "🚫 Bloquear"}
      </button>
      {error && (
        <p className="text-[11px] text-red-800 font-bold">⚠️ {error}</p>
      )}
    </div>
  );
}
