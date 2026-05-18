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
    <nav className="flex flex-wrap gap-1.5 md:gap-2">
      <button
        type="button"
        onClick={() => setCategory(null)}
        className={`chip text-xs md:text-sm ${
          category === null ? "chip-active" : "chip-idle"
        }`}
      >
        🗂️ <span className="hidden md:inline">Todos</span>
        <span className="md:hidden">Todos</span>
        <span className="opacity-60 ml-1">{total}</span>
      </button>
      {POST_CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => setCategory(c.value)}
          className={`chip text-xs md:text-sm ${
            category === c.value ? "chip-active" : "chip-idle"
          }`}
        >
          {c.icon} <span className="hidden sm:inline">{c.label}</span>
          <span className="opacity-60 ml-1">{active[c.value] ?? 0}</span>
        </button>
      ))}
    </nav>
  );
}
