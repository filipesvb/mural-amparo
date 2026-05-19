"use client";

import { useState, useTransition } from "react";
import { reviewEvent } from "@/app/actions";
import type { CityEventWithAuthor } from "@/utils/types";
import { formatEventWhen } from "@/utils/events";

export default function EventReviewQueue({
  events,
}: {
  events: CityEventWithAuthor[];
}) {
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function review(eventId: number, decision: "aprovar" | "recusar") {
    setError("");
    setBusyId(eventId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("event_id", String(eventId));
      fd.set("decision", decision);
      const result = await reviewEvent(fd);
      if (result?.error) setError(result.error);
      setBusyId(null);
    });
  }

  if (events.length === 0) {
    return (
      <p className="p-4 text-xs italic text-mural-ink/50 text-center border-2 border-dashed border-mural-line rounded-lg">
        Nenhuma sugestão aguardando aprovação.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-100 border-2 border-red-800 text-red-800 text-xs font-bold retro-border">
          ⚠️ {error}
        </div>
      )}

      <ul className="space-y-3">
        {events.map((ev) => {
          const rowBusy = busyId === ev.id && isPending;
          return (
            <li
              key={ev.id}
              className="soft-card p-4 space-y-2 border-l-4 border-mural-brown"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-mural-ink">{ev.title}</p>
                  <p className="text-xs text-mural-ink/60">
                    {formatEventWhen(ev.starts_at)} · {ev.location}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase bg-mural-brown/15 text-mural-ink px-2 py-1 rounded-lg shrink-0">
                  Pendente
                </span>
              </div>

              {ev.description && (
                <p className="text-sm text-mural-ink/80 whitespace-pre-wrap">
                  {ev.description}
                </p>
              )}

              <p className="text-[11px] italic text-mural-ink/50">
                Sugerido por {ev.suggester?.nickname ?? "morador"}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => review(ev.id, "aprovar")}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-mural-brown text-white retro-button-active disabled:opacity-50"
                >
                  {rowBusy ? "..." : "✓ Aprovar"}
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => review(ev.id, "recusar")}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-mural-dark bg-mural-creme disabled:opacity-50"
                >
                  {rowBusy ? "..." : "✕ Recusar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
