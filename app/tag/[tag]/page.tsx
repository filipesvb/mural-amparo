import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";
import { MentionsProvider } from "@/components/MentionsProvider";
import { signOut } from "@/app/actions";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import { canonicalTag, hashtagMatchPattern } from "@/utils/hashtags";
import type { PostWithRelations } from "@/utils/types";

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = canonicalTag(decodeURIComponent(rawTag));

  if (!/^[a-z0-9_]{2,30}$/.test(tag)) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles (nickname, avatar_seed),
      reactions (user_id, emoji),
      comments (*)
    `,
    )
    .filter("content", "imatch", hashtagMatchPattern(tag))
    .order("created_at", { ascending: false })
    .limit(50);

  const postsList: PostWithRelations[] = posts ?? [];

  const { notifications: initialNotifications, unreadCount } = user
    ? await fetchInitialNotifications(user.id)
    : { notifications: [], unreadCount: 0 };

  const initialValidMentions = await fetchValidMentions(
    collectMentionsFromPosts(postsList),
  );

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center bg-mural-creme">
      <div className="w-full max-w-3xl bg-mural-creme retro-border rounded-xl flex flex-col overflow-hidden self-start">
        <header className="wood-header-footer shrink-0 p-4 border-b-2 flex justify-between items-center text-mural-creme">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs bg-mural-dark px-2 py-1 border border-white retro-button-active hover:text-white"
            >
              [←] Mural
            </Link>
            <h1 className="text-xl font-bold tracking-tight">#{tag}</h1>
          </div>

          <div className="flex-1 mx-4 hidden md:flex justify-center">
            <SearchBar />
          </div>

          {user ? (
            <div className="flex items-center gap-3">
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
              className="bg-mural-dark text-white px-3 py-1 rounded border border-white retro-button-active text-xs font-bold"
            >
              Entrar 🔑
            </Link>
          )}
        </header>

        <section className="flex-1 p-4 space-y-4 bg-white/50">
          <h3 className="text-sm font-bold uppercase text-mural-dark border-b-2 border-mural-dark pb-1">
            🏷️ Recados com #{tag}
          </h3>

          {postsList.length === 0 ? (
            <div className="text-center p-8 opacity-50 italic">
              Nenhum recado com #{tag} ainda.
            </div>
          ) : (
            <MentionsProvider initialValidMentions={initialValidMentions}>
              {postsList.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  bgClass={index % 2 === 0 ? "bg-white" : "bg-mural-green"}
                />
              ))}
            </MentionsProvider>
          )}
        </section>

        <footer className="wood-header-footer shrink-0 p-4 border-t-2 text-center text-mural-creme">
          <p className="text-[10px] opacity-70">© 2026 - Conectando Amparo</p>
        </footer>
      </div>
    </main>
  );
}
