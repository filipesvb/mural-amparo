import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import NotificationBell from "@/components/NotificationBell";
import { MentionsProvider } from "@/components/MentionsProvider";
import { signOut } from "@/app/actions";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import type { PostWithRelations } from "@/utils/types";

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
      profiles (nickname, avatar_seed),
      likes (user_id),
      comments (*)
    `,
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const postsList: PostWithRelations[] = posts ?? [];
  const totalPosts = postsList.length;
  const totalLikesRecebidas = postsList.reduce(
    (acc, p) => acc + (p.likes?.length ?? 0),
    0,
  );

  const { notifications: initialNotifications, unreadCount } = user
    ? await fetchInitialNotifications(user.id)
    : { notifications: [], unreadCount: 0 };

  const initialValidMentions = await fetchValidMentions(
    collectMentionsFromPosts(postsList),
  );

  const isOwner = user?.id === profile.id;
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null;

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
            <h1 className="text-xl font-bold tracking-tight">
              👤 Perfil de Morador
            </h1>
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

        <section className="bg-mural-panel border-b-2 border-mural-dark p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="w-24 h-24 bg-mural-brown retro-border overflow-hidden shrink-0">
            <Image
              src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent((profile.avatar_seed || profile.nickname || "morador").trim())}`}
              alt={`avatar de ${profile.nickname}`}
              width={96}
              height={96}
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-2xl font-bold text-mural-dark">
              {profile.nickname}
            </h2>
            {memberSince && (
              <p className="text-xs italic opacity-70">
                🌳 Morador desde {memberSince}
              </p>
            )}
            <div className="flex gap-4 justify-center md:justify-start text-sm font-bold mt-3">
              <span className="bg-white retro-border px-3 py-1">
                📝 {totalPosts}{" "}
                <span className="font-normal opacity-70">
                  {totalPosts === 1 ? "recado" : "recados"}
                </span>
              </span>
              <span className="bg-white retro-border px-3 py-1">
                ❤️ {totalLikesRecebidas}{" "}
                <span className="font-normal opacity-70">
                  {totalLikesRecebidas === 1
                    ? "curtida recebida"
                    : "curtidas recebidas"}
                </span>
              </span>
            </div>
          </div>

          {isOwner && (
            <Link
              href="/perfil/editar"
              className="bg-mural-brown text-white px-4 py-2 text-sm font-bold retro-border retro-button-active shrink-0"
            >
              ✏️ Editar perfil
            </Link>
          )}
        </section>

        <section className="flex-1 p-4 space-y-4 bg-white/50">
          <h3 className="text-sm font-bold uppercase text-mural-dark border-b-2 border-mural-dark pb-1">
            📰 Recados publicados
          </h3>

          {postsList.length === 0 ? (
            <div className="text-center p-8 opacity-50 italic">
              {isOwner
                ? "Você ainda não publicou nenhum recado em Amparo."
                : `${profile.nickname} ainda não deixou recados no Mural.`}
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
