import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";
import { MentionsProvider } from "@/components/MentionsProvider";
import { signOut } from "@/app/actions";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import type { PostWithRelations } from "@/utils/types";
import { asRole } from "@/utils/roles";

export default async function SalvosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // bookmarks é privada (RLS escopada ao dono): este select já só traz os
  // salvos do próprio usuário. posts é embed to-one (bookmarks.post_id).
  const { data: rows } = await supabase
    .from("bookmarks")
    .select(
      `
      created_at,
      posts (
        *,
        profiles (nickname, avatar_seed, avatar_path, role),
        reactions (user_id, emoji),
        comments (*),
        bookmarks (user_id)
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const postsList: PostWithRelations[] = (
    (rows ?? []) as unknown as { posts: PostWithRelations | null }[]
  )
    .map((r) => r.posts)
    .filter((p): p is PostWithRelations => p != null);

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const viewerRole = asRole(me?.role);

  const { notifications: initialNotifications, unreadCount } =
    await fetchInitialNotifications(user.id);

  const initialValidMentions = await fetchValidMentions(
    collectMentionsFromPosts(postsList),
  );

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
            <h1 className="text-lg mural-title text-mural-creme">
              🔖 Recados salvos
            </h1>
          </div>

          <div className="flex-1 mx-4 hidden md:flex justify-center">
            <SearchBar />
          </div>

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
        </header>

        <section className="bg-mural-panel/60 border-b border-mural-line px-6 py-4">
          <p className="text-sm text-mural-ink/70">
            Só você vê esta lista. Recados que você salvou para reler depois —
            toque no 🔖 de novo para remover.
          </p>
        </section>

        <section className="flex-1 p-4 space-y-4">
          {postsList.length === 0 ? (
            <div className="text-center p-8 text-mural-ink/40 italic">
              Você ainda não salvou nenhum recado. Toque no 🔖 de um recado no
              mural para guardá-lo aqui.
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
