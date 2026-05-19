"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/actions";

// Usado pela staff na agenda pra tirar um evento já aprovado (acabou, foi
// cancelado, entrou errado). A RLS confirma a permissão no servidor.
export default function DeleteEventButton({ eventId }: { eventId: number }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Remover este evento da agenda?")) return;
    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("event_id", String(eventId));
      const result = await deleteEvent(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        className="text-[11px] font-bold text-red-800 hover:underline disabled:opacity-50"
        title={error || "Remover da agenda"}
      >
        {isPending ? "..." : "Remover"}
      </button>
    </span>
  );
}
