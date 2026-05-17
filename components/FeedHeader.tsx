"use client";

import { useFeedFilter } from "./FeedFilterProvider";
import type { ScopeCounts } from "./CategoryChips";

export default function FeedHeader({ counts }: { counts: ScopeCounts }) {
  const { feed } = useFeedFilter();

  const active =
    feed === "seguindo" ? (counts.seguindo ?? {}) : counts.publico;
  const total = Object.values(active).reduce((a, b) => a + b, 0);
  const title = feed === "seguindo" ? "Seguindo" : "Feed Público";

  return (
    <div className="flex items-end justify-between">
      <h2 className="text-2xl text-mural-ink mural-title">{title}</h2>
      <span className="text-xs text-mural-ink/50">
        {total} {total === 1 ? "recado" : "recados"}
      </span>
    </div>
  );
}
