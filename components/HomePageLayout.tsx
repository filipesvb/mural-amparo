"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions";
import CreatePostWidget from "@/components/CreatePostWidget";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";
import { MentionsProvider } from "@/components/MentionsProvider";
import { FeedFilterProvider } from "@/components/FeedFilterProvider";
import CategoryChips, { type ScopeCounts } from "@/components/CategoryChips";
import FeedHeader from "@/components/FeedHeader";
import SidebarNav from "@/components/SidebarNav";
import RealtimeFeed from "@/components/RealtimeFeed";
import MobileMenuButton from "@/components/MobileMenuButton";
import type { PostWithRelations, NotificationWithActor, Profile } from "@/utils/types";
import type { Role } from "@/utils/roles";
import type { PostCategory } from "@/utils/categories";
import { isAdmin } from "@/utils/roles";

const UPCOMING_EVENTS = [
  {
    day: "23",
    month: "MAI",
    title: "Feirão da Praça",
    place: "Praça Pádua Sales · 8h",
  },
  {
    day: "07",
    month: "JUN",
    title: "Festival de Inverno",
    place: "Centro Histórico · 18h",
  },
  {
    day: "15",
    month: "JUN",
    title: "Mutirão da Limpeza",
    place: "Rio Camanducaia · 7h",
  },
];

interface HomePageLayoutProps {
  user: User | null;
  profile: Profile | null;
  posts: PostWithRelations[];
  counts: ScopeCounts;
  initialCategory: PostCategory | null;
  initialFeed: "seguindo" | null;
  initialNotifications: NotificationWithActor[];
  unreadCount: number;
  initialValidMentions: string[];
  trending: Array<{ tag: string }>;
  viewerRole?: Role | null;
  followingIds: string[] | null;
  error: Error | null;
}

export default function HomePageLayout({
  user,
  profile,
  posts,
  counts,
  initialCategory,
  initialFeed,
  initialNotifications,
  unreadCount,
  initialValidMentions,
  trending,
  viewerRole,
  followingIds,
  error,
}: HomePageLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <main className="h-screen overflow-hidden p-3 md:p-6 flex justify-center items-start">
      <div className="w-full max-w-6xl bg-mural-creme border border-mural-line rounded-2xl shadow-md flex flex-col overflow-hidden h-full">
        {/* Header */}
        <header className="wood-header shrink-0 px-3 md:px-5 py-4 flex items-center gap-2 md:gap-4">
          <MobileMenuButton
            isOpen={isMenuOpen}
            onToggle={() => setIsMenuOpen(!isMenuOpen)}
          />

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="bg-mural-creme rounded-xl p-1 md:p-1.5 shadow-sm shrink-0">
              <Image
                src="/construcao-amparo-logo.png"
                width={56}
                height={48}
                alt="Logo Mural Amparo"
                className="w-10 h-auto md:w-14"
              />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg md:text-2xl text-mural-creme mural-title">
                Mural Amparo
              </h1>
              <p className="hidden md:block text-[11px] italic text-mural-creme/80">
                Um pedaço da cidade no seu bolso
              </p>
            </div>
          </div>

          <div className="flex-1 flex justify-center min-w-0">
            <div className="hidden md:block w-full max-w-md">
              <SearchBar />
            </div>
          </div>

          <div className="flex items-center gap-3 text-mural-creme shrink-0">
            <span className="text-sm hidden md:inline">
              Olá,{" "}
              <span className="font-bold text-yellow-200">
                {user
                  ? (profile?.nickname ?? user.email?.split("@")[0])
                  : "visitante"}
              </span>
            </span>
            {user && (
              <NotificationBell
                user={user}
                initialNotifications={initialNotifications}
                initialUnreadCount={unreadCount}
              />
            )}
          </div>
        </header>

        <div className="bg-mural-green/70 shrink-0 border-y border-mural-line py-1.5 text-center text-sm italic text-mural-ink/70">
          &ldquo;Onde a cidade se encontra, um recado de cada vez.&rdquo;
        </div>

        <FeedFilterProvider
          initialCategory={initialCategory}
          initialFeed={initialFeed}
          isLoggedIn={!!user}
        >
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
            {/* Mobile menu overlay */}
            {isMenuOpen && (
              <div
                className="fixed inset-0 bg-black/30 md:hidden z-30 backdrop-blur-sm transition-opacity"
                onClick={closeMenu}
                aria-label="Fechar menu"
              />
            )}

            {/* Left sidebar */}
            <aside
              className={`fixed md:relative left-0 top-0 w-64 md:w-60 shrink-0 p-4 space-y-6 bg-mural-panel/90 transition-all duration-300 z-40 overflow-y-auto md:overflow-visible ${
                isMenuOpen ? "h-full" : "hidden md:flex md:flex-col"
              }`}
            >
              {/* Mobile header com botão fechar */}
              <div className="flex items-center justify-between md:hidden pb-3 border-b border-mural-line mb-2">
                <h2 className="text-sm font-bold text-mural-ink uppercase tracking-wide">
                  Menu
                </h2>
                <button
                  onClick={closeMenu}
                  className="p-1.5 hover:bg-mural-ink/10 rounded-lg transition-colors text-mural-ink shrink-0"
                  aria-label="Fechar menu"
                  type="button"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Busca no menu mobile (no desktop ela já fica no header) */}
              <div className="md:hidden">
                <SearchBar onNavigate={closeMenu} />
              </div>

              <SidebarNav
                showAdmin={isAdmin(viewerRole)}
                onSelect={closeMenu}
              />

              <div className="pt-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-mural-ink/50 px-3">
                  Tags em alta
                </h3>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {trending.length === 0 ? (
                    <p className="text-xs italic text-mural-ink/40 px-2">
                      Nenhuma ainda.
                    </p>
                  ) : (
                    trending.map(({ tag }) => (
                      <Link
                        key={tag}
                        href={`/tag/${tag}`}
                        className="chip chip-idle text-[11px] py-0.5"
                        onClick={closeMenu}
                      >
                        #{tag}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Auth button - mobile only */}
              <div className="md:hidden pt-4 border-t border-mural-line">
                {user ? (
                  <form action={signOut} className="w-full">
                    <button
                      type="submit"
                      className="w-full bg-mural-brown/20 hover:bg-mural-brown/30 text-mural-ink px-4 py-2.5 text-sm font-bold rounded-lg transition-colors text-left flex items-center gap-2"
                    >
                      <span>🚪</span>
                      Sair
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/login"
                    className="block w-full bg-mural-brown/20 hover:bg-mural-brown/30 text-mural-ink px-4 py-2.5 text-sm font-bold rounded-lg transition-colors text-center"
                    onClick={closeMenu}
                  >
                    Entrar 🔑
                  </Link>
                )}
              </div>
            </aside>

            {/* Main content */}
            <section className="flex-1 p-4 space-y-4 min-w-0 overflow-y-auto min-h-0">
              <CreatePostWidget user={user} profile={profile} />

              <FeedHeader counts={counts} />

              <CategoryChips counts={counts} />

              {error && (
                <div className="bg-red-100 border border-red-300 rounded-xl p-4 text-red-800 text-sm">
                  Erro ao carregar os recados de Amparo. Tente novamente mais
                  tarde.
                </div>
              )}

              <MentionsProvider initialValidMentions={initialValidMentions}>
                <RealtimeFeed
                  initialPosts={posts}
                  user={user}
                  viewerRole={viewerRole}
                  followingIds={followingIds}
                />
              </MentionsProvider>
            </section>

            {/* Right sidebar */}
            <aside className="w-full md:w-72 shrink-0 p-4 space-y-4 bg-mural-panel/60 hidden md:block">
              <div className="bg-mural-forest text-mural-creme p-4 rounded-xl shadow-sm">
                <h3 className="font-bold border-b border-mural-creme/30 pb-1 mb-2">
                  Sobre
                </h3>
                <p className="text-xs leading-relaxed">
                  Espaço para moradores de Amparo compartilharem notícias,
                  achados e perdidos ou apenas um café.
                </p>
              </div>

              <div className="soft-card p-4">
                <h3 className="font-bold text-mural-ink mb-3">
                  Próximos eventos
                </h3>
                <ul className="space-y-3">
                  {UPCOMING_EVENTS.map((e) => (
                    <li key={e.title} className="flex items-center gap-3">
                      <div className="bg-mural-creme border border-mural-line rounded-lg w-11 text-center py-1 shrink-0">
                        <div className="text-base font-extrabold text-mural-ink leading-none">
                          {e.day}
                        </div>
                        <div className="text-[9px] font-bold uppercase text-mural-ink/50">
                          {e.month}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-mural-ink truncate">
                          {e.title}
                        </p>
                        <p className="text-[11px] text-mural-ink/50 truncate">
                          {e.place}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="soft-card p-4">
                <h3 className="font-bold text-mural-ink mb-2">Tempo agora</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold text-mural-brown">
                    21°
                  </span>
                  <div className="text-[11px] text-mural-ink/60">
                    <p>Parcialmente nublado</p>
                    <p>mín 17° · máx 24°</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </FeedFilterProvider>

        {/* Footer */}
        <footer className="wood-header-footer shrink-0 p-6 text-center text-mural-creme">
          <p className="mural-title text-lg mb-1">Mural Amparo</p>
          <p className="text-[10px] opacity-70">© 2026 · Conectando Amparo</p>
        </footer>
      </div>
    </main>
  );
}
