import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { fetchFollowingIds } from "@/utils/follows.server";
import { fetchTrendingHashtags } from "@/utils/hashtags.server";
import { FEED_PAGE_SIZE } from "@/utils/feed";
import { fetchInitialNotifications } from "@/utils/notifications";
import { collectMentionsFromPosts } from "@/utils/mentions";
import { fetchValidMentions } from "@/utils/mentions.server";
import HomePageLayout from "@/components/HomePageLayout";
import type { PostWithRelations } from "@/utils/types";
import { isPostCategory, type PostCategory } from "@/utils/categories";
import { asRole } from "@/utils/roles";
import type { ScopeCounts } from "@/components/CategoryChips";


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
  const initialCategory: PostCategory | null = isPostCategory(cat) ? cat : null;
  const initialFeed: "seguindo" | null =
    feed === "seguindo" ? "seguindo" : null;

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
    <HomePageLayout
      user={user}
      profile={profile}
      posts={postsList}
      counts={counts}
      initialCategory={initialCategory}
      initialFeed={initialFeed}
      initialNotifications={initialNotifications}
      unreadCount={unreadCount}
      initialValidMentions={initialValidMentions}
      trending={trending}
      viewerRole={asRole(profile?.role)}
      followingIds={followingIds}
      error={error}
    />
  );
}
