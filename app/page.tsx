import CreatePostWidget from "@/components/CreatePostWidget";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { fetchFollowingIds } from "@/utils/follows.server";
import { fetchTrendingHashtags } from "@/utils/hashtags.server";
import { FEED_PAGE_SIZE } from "@/utils/feed";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import RealtimeFeed from "@/components/RealtimeFeed";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";
import { MentionsProvider } from "@/components/MentionsProvider";
import { FeedFilterProvider } from "@/components/FeedFilterProvider";
import CategoryChips, { type ScopeCounts } from "@/components/CategoryChips";
import FeedHeader from "@/components/FeedHeader";
import SidebarNav from "@/components/SidebarNav";
import type { PostWithRelations } from "@/utils/types";
import { isPostCategory, type PostCategory } from "@/utils/categories";
import { asRole, isAdmin } from "@/utils/roles";
import Image from "next/image";

const UPCOMING_EVENTS = [
  { day: "23", month: "MAI", title: "Feirão da Praça", place: "Praça Pádua Sales · 8h" },
  { day: "07", month: "JUN", title: "Festival de Inverno", place: "Centro Histórico · 18h" },
  { day: "15", month: "JUN", title: "Mutirão da Limpeza", place: "Rio Camanducaia · 7h" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; feed?: string }>;
}) {
  const supabase = await createClient();

  const { cat, feed } = await searchParams;
  // Filtros vêm da URL apenas como estado inicial — daqui pra frente são
  // client-side (instantâneos), mas o servidor ainda renderiza o HTML certo
  // num acesso direto a /?cat=... ou /?feed=seguindo (SEO / refresh).
  const initialCategory: PostCategory | null = isPostCategory(cat)
    ? cat
    : null;
  const initialFeed: "seguindo" | null = feed === "seguindo" ? "seguindo" : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "Seguindo" exige login (proteção página a página). Vale só para o
  // acesso direto sem sessão; a troca client-side já barra deslogado.
  if (initialFeed === "seguindo" && !user) {
    redirect("/login");
  }

  // followingIds sempre que logado: alimenta o filtro "Seguindo" instantâneo
  // e a contagem por escopo dos chips.
  const followingIds = user ? await fetchFollowingIds(user.id) : null;
  const followingSet = followingIds ? new Set(followingIds) : null;

  // Feed sempre público e sem filtro de categoria — o RealtimeFeed filtra
  // em memória conforme o usuário troca de chip/escopo.
  const [res, countRes] = await Promise.all([
    supabase
      .from("posts")
      .select(
        `
        *,
        profiles (nickname, avatar_seed, avatar_path, role),
        reactions (user_id, emoji),
        comments (*),
        bookmarks (user_id)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(FEED_PAGE_SIZE),
    supabase.from("posts").select("category, user_id"),
  ]);

  const posts = res.data as PostWithRelations[] | null;
  const error = res.error;

  // Contagens reais do banco, por escopo, pra refletirem na hora quando o
  // usuário alterna Feed Público ↔ Seguindo sem ida ao servidor.
  const publico: Record<string, number> = {};
  const seguindo: Record<string, number> | null = followingSet ? {} : null;
  for (const row of countRes.data ?? []) {
    const r = row as { category: string; user_id: string };
    publico[r.category] = (publico[r.category] ?? 0) + 1;
    if (seguindo && followingSet?.has(r.user_id)) {
      seguindo[r.category] = (seguindo[r.category] ?? 0) + 1;
    }
  }
  const counts: ScopeCounts = { publico, seguindo };

  if (error) {
    console.error("Falha ao buscar posts:", error);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  const { notifications: initialNotifications, unreadCount } = user
    ? await fetchInitialNotifications(user.id)
    : { notifications: [], unreadCount: 0 };

  const postsList: PostWithRelations[] = posts ?? [];
  const initialValidMentions = await fetchValidMentions(
    collectMentionsFromPosts(postsList),
  );
  const trending = await fetchTrendingHashtags(6);

  return (
    <main className="min-h-screen p-3 md:p-6 flex justify-center items-start">
      <div className="w-full max-w-6xl bg-mural-creme border border-mural-line rounded-2xl shadow-md flex flex-col overflow-hidden">
        <header className="wood-header shrink-0 px-5 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-mural-creme rounded-xl p-1.5 shadow-sm">
              <Image
                src="/construcao-amparo-logo.png"
                width={56}
                height={48}
                alt="Logo Mural Amparo"
              />
            </div>
            <div className="leading-tight">
              <h1 className="text-2xl text-mural-creme mural-title">
                Mural Amparo
              </h1>
              <p className="text-[11px] italic text-mural-creme/80">
                desde 1829 · um pedaço da cidade no seu bolso
              </p>
            </div>
          </div>

          <div className="flex-1 hidden md:flex justify-center">
            <SearchBar />
          </div>

          {user ? (
            <div className="flex items-center gap-3 text-mural-creme shrink-0">
              <span className="text-sm hidden md:inline">
                Olá,{" "}
                <span className="font-bold text-yellow-200">
                  {profile?.nickname ?? user.email?.split("@")[0]}
                </span>
              </span>
              <NotificationBell
                user={user}
                initialNotifications={initialNotifications}
                initialUnreadCount={unreadCount}
              />
              <form action={signOut}>
                <button
                  type="submit"
                  className="bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
                >
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-4 py-1.5 rounded-lg text-sm font-bold shrink-0"
            >
              Entrar 🔑
            </Link>
          )}
        </header>

        <div className="bg-mural-green/70 shrink-0 border-y border-mural-line py-1.5 text-center text-sm italic text-mural-ink/70">
          &ldquo;Onde a cidade se encontra, um recado de cada vez.&rdquo;
        </div>

        <FeedFilterProvider
          initialCategory={initialCategory}
          initialFeed={initialFeed}
          isLoggedIn={!!user}
        >
          <div className="flex flex-1 flex-col md:flex-row">
            <aside className="w-full md:w-60 shrink-0 p-4 space-y-6 bg-mural-panel/60 hidden md:block">
              <SidebarNav showAdmin={isAdmin(asRole(profile?.role))} />

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-mural-ink/50 mb-2 px-3">
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
                      >
                        #{tag}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </aside>

            <section className="flex-1 p-4 space-y-4 min-w-0">
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
                  initialPosts={postsList}
                  user={user}
                  viewerRole={asRole(profile?.role)}
                  followingIds={followingIds}
                />
              </MentionsProvider>
            </section>

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

        <footer className="wood-header-footer shrink-0 p-6 text-center text-mural-creme">
          <p className="mural-title text-lg mb-1">Mural Amparo</p>
          <p className="text-[10px] opacity-70">© 2026 · Conectando Amparo</p>
        </footer>
      </div>
    </main>
  );
}
