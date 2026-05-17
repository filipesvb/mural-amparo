"use client";

import Link from "next/link";
import { useFeedFilter } from "./FeedFilterProvider";

const baseClass =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left";
const activeClass = "bg-mural-brown/15 text-mural-ink font-bold";
const idleClass = "text-mural-ink/80 hover:bg-mural-brown/10";

export default function SidebarNav({
  showAdmin = false,
}: {
  showAdmin?: boolean;
}) {
  const { feed, setFeed } = useFeedFilter();

  return (
    <nav className="space-y-1">
      <button
        type="button"
        onClick={() => setFeed(null)}
        className={`${baseClass} ${feed === null ? activeClass : idleClass}`}
      >
        <span>📰</span>
        Feed Público
      </button>
      <button
        type="button"
        onClick={() => setFeed("seguindo")}
        className={`${baseClass} ${
          feed === "seguindo" ? activeClass : idleClass
        }`}
      >
        <span>👥</span>
        Seguindo
      </button>
      <Link href="/perfil" className={`${baseClass} ${idleClass}`}>
        <span>👤</span>
        Seu Perfil
      </Link>
      <Link href="/perfil/salvos" className={`${baseClass} ${idleClass}`}>
        <span>🔖</span>
        Salvos
      </Link>
      <Link href="#" className={`${baseClass} ${idleClass}`}>
        <span>🔗</span>
        Links Úteis
      </Link>
      {showAdmin && (
        <Link href="/admin" className={`${baseClass} ${idleClass}`}>
          <span>⭐</span>
          Painel do Admin
        </Link>
      )}
    </nav>
  );
}
