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
import { asRole } from "@/utils/roles";

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
      profiles (nickname, avatar_seed, avatar_path, role),
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

  let viewerRole = asRole(null);
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    viewerRole = asRole(me?.role);
  }

  return (
    <main className="min-h-screen p-3 md:p-6 flex justify-center">
      <div className="w-full max-w-3xl bg-mural-creme border border-mural-line rounded-2xl shadow-md flex flex-col overflow-hidden self-start">
        <header className="wood-header-footer shrink-0 px-5 py-4 flex justify-between items-center text-mural-creme">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold"
            >
              ← Mural
            </Link>
            <h1 className="text-lg mural-title text-mural-creme">#{tag}</h1>
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
                  className="bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 text-xs font-bold rounded-lg"
                >
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
            >
              Entrar 🔑
            </Link>
          )}
        </header>

        <section className="flex-1 p-4 space-y-4">
          <h3 className="text-sm font-bold uppercase text-mural-ink/60 border-b border-mural-line pb-2">
            🏷️ Recados com #{tag}
          </h3>

          {postsList.length === 0 ? (
            <div className="text-center p-8 text-mural-ink/40 italic">
              Nenhum recado com #{tag} ainda.
            </div>
          ) : (
            <MentionsProvider initialValidMentions={initialValidMentions}>
              {postsList.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  viewerRole={viewerRole}
                />
              ))}
            </MentionsProvider>
          )}
        </section>

        <footer className="wood-header-footer shrink-0 p-5 text-center text-mural-creme">
          <p className="text-[10px] opacity-70">© 2026 · Conectando Amparo</p>
        </footer>
      </div>
    </main>
  );
}
