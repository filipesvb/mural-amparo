import CreatePostWidget from "@/components/CreatePostWidget";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { signOut } from "@/app/actions";
import RealtimeFeed from "@/components/RealtimeFeed";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles (nickname, avatar_seed),
      likes (user_id),
      comments (*)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Falha ao buscar posts:", error);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center">
      <div className="w-full max-w-6xl h-full bg-mural-creme retro-border rounded-xl flex flex-col overflow-hidden">
        <header className="wood-header-footer shrink-0 p-4 border-b-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-mural-creme retro-border flex items-center justify-center">
              🕒
            </div>
            <h1 className="text-2xl font-bold text-mural-creme tracking-tight">
              Mural Amparo
            </h1>
          </div>

          {user ? (
            <div className="flex items-center gap-4 text-mural-creme">
              <span className="text-sm font-bold hidden md:inline">
                Olá,{" "}
                <span className="text-yellow-300">
                  {profile?.nickname ?? user.email?.split("@")[0]}
                </span>
              </span>
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

            {error && (
              <div className="bg-red-100 border-2 border-red-800 p-4 text-red-800 retro-border">
                Erro ao carregar os recados de Amparo. Tente novamente mais
                tarde.
              </div>
            )}

            <RealtimeFeed initialPosts={posts || []} user={user} />

            {posts?.length === 0 && (
              <div className="text-center p-8 opacity-50 italic">
                Nenhum recado por aqui ainda... Seja o primeiro!
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
