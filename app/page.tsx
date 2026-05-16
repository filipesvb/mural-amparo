import CreatePostWidget from "@/components/CreatePostWidget";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { FEED_PAGE_SIZE } from "@/utils/feed";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import RealtimeFeed from "@/components/RealtimeFeed";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";
import { MentionsProvider } from "@/components/MentionsProvider";
import type { PostWithRelations } from "@/utils/types";
import {
  POST_CATEGORIES,
  isPostCategory,
  type PostCategory,
} from "@/utils/categories";
import Image from "next/image";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const supabase = await createClient();

  const { cat } = await searchParams;
  const activeCategory: PostCategory | null = isPostCategory(cat)
    ? cat
    : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let postsQuery = supabase
    .from("posts")
    .select(
      `
      *,
      profiles (nickname, avatar_seed),
      reactions (user_id, emoji),
      comments (*)
    `,
    );

  if (activeCategory) {
    postsQuery = postsQuery.eq("category", activeCategory);
  }

  const { data: posts, error } = await postsQuery
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

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

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center">
      <div className="w-full max-w-6xl h-full bg-mural-creme retro-border rounded-xl flex flex-col overflow-hidden">
        <header className="bg-[#4A3525] shrink-0 p-4 border-b-2 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <Image
              className=""
              src={"/construcao-amparo-logo.png"}
              width={120}
              height={30}
              alt="Imagem construção Amparo-SP"
            />
            <h1 className="text-2xl font-bold text-mural-creme tracking-tight">
              Mural Amparo
            </h1>
          </div>

          <div className="flex-1 mx-4 hidden md:flex justify-center">
            <SearchBar />
          </div>

          {user ? (
            <div className="flex items-center gap-3 text-mural-creme">
              <span className="text-sm font-bold hidden md:inline">
                Olá,{" "}
                <span className="text-yellow-300">
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
                  className="bg-red-800 text-white px-3 py-1 text-xs font-bold border border-white retro-button-active"
                >
                  Sair [X]
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-mural-dark text-white px-4 py-1 rounded border border-white retro-button-active text-sm font-bold"
            >
              Entrar 🔑
            </Link>
          )}
        </header>

        <div className="bg-mural-green shrink-0 border-b-2 border-mural-dark p-1 text-center text-sm italic">
          "Onde a cidade se encontra, um recado de cada vez."
        </div>

        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          <aside className="w-full md:w-64 shrink-0 border-r-2 border-mural-dark p-4 space-y-6 bg-mural-panel overflow-y-auto hidden md:block">
            <nav className="space-y-4 pt-4 flex flex-col">
              <Link
                href="/"
                className="flex items-center gap-2 hover:bg-mural-green p-1 transition-colors"
              >
                📰 Feed Público
              </Link>
              <Link
                href="/perfil"
                className="flex items-center gap-2 hover:bg-mural-green p-1 transition-colors"
              >
                👤 Seu Perfil
              </Link>
              <a
                href="#"
                className="flex items-center gap-2 hover:bg-mural-green p-1 transition-colors font-bold"
              >
                🌐 Links Úteis
              </a>
            </nav>
          </aside>

          <section className="flex-1 p-4 space-y-4 bg-white/50 overflow-y-auto">
            <CreatePostWidget user={user} profile={profile} />

            <nav className="flex flex-wrap gap-2 text-xs font-bold">
              <Link
                href="/"
                className={`px-3 py-1 retro-border retro-button-active ${
                  activeCategory === null
                    ? "bg-mural-brown text-white"
                    : "bg-mural-creme text-mural-dark hover:bg-white"
                }`}
              >
                🗂️ Todos
              </Link>
              {POST_CATEGORIES.map((c) => (
                <Link
                  key={c.value}
                  href={`/?cat=${c.value}`}
                  className={`px-3 py-1 retro-border retro-button-active ${
                    activeCategory === c.value
                      ? "bg-mural-brown text-white"
                      : "bg-mural-creme text-mural-dark hover:bg-white"
                  }`}
                >
                  {c.icon} {c.label}
                </Link>
              ))}
            </nav>

            {error && (
              <div className="bg-red-100 border-2 border-red-800 p-4 text-red-800 retro-border">
                Erro ao carregar os recados de Amparo. Tente novamente mais
                tarde.
              </div>
            )}

            <MentionsProvider initialValidMentions={initialValidMentions}>
              <RealtimeFeed
                key={activeCategory ?? "all"}
                initialPosts={postsList}
                user={user}
                activeCategory={activeCategory}
              />
            </MentionsProvider>

            {postsList.length === 0 && (
              <div className="text-center p-8 opacity-50 italic">
                {activeCategory
                  ? "Nenhum recado nesta categoria ainda."
                  : "Nenhum recado por aqui ainda... Seja o primeiro!"}
              </div>
            )}
          </section>

          <aside className="w-full md:w-72 shrink-0 p-4 space-y-4 bg-mural-panel border-l-2 border-mural-dark overflow-y-auto hidden md:block">
            <div className="bg-[#4a5d4e] text-mural-creme p-3 retro-border">
              <h3 className="font-bold border-b border-mural-creme mb-2">
                Sobre
              </h3>
              <p className="text-xs">
                Espaço para moradores de Amparo compartilharem notícias, achados
                e perdidos ou apenas um café.
              </p>
            </div>
          </aside>
        </div>

        <footer className="wood-header-footer shrink-0 p-4 md:p-8 border-t-2 text-center text-mural-creme">
          <p className="font-bold text-xl mb-1">Mural Amparo</p>
          <p className="text-[10px] opacity-70">© 2026 - Conectando Amparo</p>
        </footer>
      </div>
    </main>
  );
}
