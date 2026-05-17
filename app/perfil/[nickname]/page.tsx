import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/Avatar";
import RoleBadge from "@/components/RoleBadge";
import FollowButton from "@/components/FollowButton";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "@/components/SearchBar";
import { MentionsProvider } from "@/components/MentionsProvider";
import { signOut } from "@/app/actions";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import type { PostWithRelations } from "@/utils/types";
import { asRole } from "@/utils/roles";

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname: rawNickname } = await params;
  const nickname = decodeURIComponent(rawNickname);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("nickname", nickname)
    .single();

  if (!profile) notFound();

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
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const postsList: PostWithRelations[] = posts ?? [];
  const totalPosts = postsList.length;
  const totalReacoesRecebidas = postsList.reduce(
    (acc, p) => acc + (p.reactions?.length ?? 0),
    0,
  );

  const { notifications: initialNotifications, unreadCount } = user
    ? await fetchInitialNotifications(user.id)
    : { notifications: [], unreadCount: 0 };

  const initialValidMentions = await fetchValidMentions(
    collectMentionsFromPosts(postsList),
  );

  const isOwner = user?.id === profile.id;

  // Papel de quem está vendo (libera a UI de moderação nos PostCard).
  let viewerRole = asRole(null);
  if (user) {
    if (isOwner) {
      viewerRole = asRole(profile.role);
    } else {
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      viewerRole = asRole(me?.role);
    }
  }

  const [{ count: followersCount }, { count: followingCount }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

  let isFollowing = false;
  if (user && !isOwner) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null;

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
              Perfil de Morador
            </h1>
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

        <section className="bg-mural-panel/60 border-b border-mural-line p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="w-24 h-24 bg-mural-creme rounded-xl ring-1 ring-mural-line border-b-4 border-mural-brown overflow-hidden shrink-0">
            <Avatar
              avatarPath={profile.avatar_path}
              seed={profile.avatar_seed}
              name={profile.nickname}
              size={96}
              alt={`avatar de ${profile.nickname}`}
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-2xl font-extrabold text-mural-ink flex items-center gap-2 justify-center md:justify-start">
              {profile.nickname}
              <RoleBadge role={asRole(profile.role)} />
            </h2>
            {memberSince && (
              <p className="text-xs italic text-mural-ink/50">
                🌳 Morador desde {memberSince}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start text-sm font-bold mt-3">
              <span className="bg-mural-card border border-mural-line rounded-full px-3 py-1">
                📝 {totalPosts}{" "}
                <span className="font-normal text-mural-ink/50">
                  {totalPosts === 1 ? "recado" : "recados"}
                </span>
              </span>
              <span className="bg-mural-card border border-mural-line rounded-full px-3 py-1">
                😊 {totalReacoesRecebidas}{" "}
                <span className="font-normal text-mural-ink/50">
                  {totalReacoesRecebidas === 1
                    ? "reação recebida"
                    : "reações recebidas"}
                </span>
              </span>
              <span className="bg-mural-card border border-mural-line rounded-full px-3 py-1">
                👥 {followersCount ?? 0}{" "}
                <span className="font-normal text-mural-ink/50">
                  {(followersCount ?? 0) === 1 ? "seguidor" : "seguidores"}
                </span>
              </span>
              <span className="bg-mural-card border border-mural-line rounded-full px-3 py-1">
                {followingCount ?? 0}{" "}
                <span className="font-normal text-mural-ink/50">seguindo</span>
              </span>
            </div>
          </div>

          {isOwner ? (
            <Link
              href="/perfil/editar"
              className="bg-mural-brown text-white px-4 py-2 text-sm font-bold rounded-lg retro-button-active shrink-0"
            >
              ✏️ Editar perfil
            </Link>
          ) : (
            user && (
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={isFollowing}
              />
            )
          )}
        </section>

        <section className="flex-1 p-4 space-y-4">
          <h3 className="text-sm font-bold uppercase text-mural-ink/60 border-b border-mural-line pb-2">
            📰 Recados publicados
          </h3>

          {postsList.length === 0 ? (
            <div className="text-center p-8 text-mural-ink/40 italic">
              {isOwner
                ? "Você ainda não publicou nenhum recado em Amparo."
                : `${profile.nickname} ainda não deixou recados no Mural.`}
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
