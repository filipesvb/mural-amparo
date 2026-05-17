"use client";

import { POST_CATEGORIES } from "@/utils/categories";
import { useFeedFilter } from "./FeedFilterProvider";

export type ScopeCounts = {
  publico: Record<string, number>;
  seguindo: Record<string, number> | null;
};

function sum(map: Record<string, number>) {
  return Object.values(map).reduce((a, b) => a + b, 0);
}

export default function CategoryChips({ counts }: { counts: ScopeCounts }) {
  const { category, feed, setCategory } = useFeedFilter();

  const active =
    feed === "seguindo" ? (counts.seguindo ?? {}) : counts.publico;
  const total = sum(active);

  return (
    <nav className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setCategory(null)}
        className={`chip ${category === null ? "chip-active" : "chip-idle"}`}
      >
        🗂️ Todos <span className="opacity-60">{total}</span>
      </button>
      {POST_CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => setCategory(c.value)}
          className={`chip ${
            category === c.value ? "chip-active" : "chip-idle"
          }`}
        >
          {c.icon} {c.label}{" "}
          <span className="opacity-60">{active[c.value] ?? 0}</span>
        </button>
      ))}
    </nav>
  );
}
