// Exportação de dados pessoais (direito LGPD de portabilidade).
// Retorna JSON com tudo que o app guarda do usuário logado, num único arquivo
// pra download. Roda no servidor com a sessão do próprio usuário — não usa
// service role, então RLS continua filtrando exatamente o que ele tem direito
// de ver.
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [
    profileRes,
    postsRes,
    commentsRes,
    reactionsRes,
    bookmarksRes,
    followingRes,
    followersRes,
    pushSubsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("comments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("reactions")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", user.id),
    supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", user.id),
    supabase
      .from("push_subscriptions")
      .select("endpoint, created_at")
      .eq("user_id", user.id),
  ]);

  const payload = {
    exportado_em: new Date().toISOString(),
    aviso:
      "Este arquivo contém todos os dados pessoais que o Mural Amparo guarda sobre você. " +
      "Para excluir tudo, use 'Excluir minha conta' em Editar perfil.",
    conta: {
      id: user.id,
      email: user.email,
      criada_em: user.created_at,
      ultimo_login: user.last_sign_in_at,
    },
    perfil: profileRes.data,
    posts: postsRes.data ?? [],
    comentarios: commentsRes.data ?? [],
    reacoes: reactionsRes.data ?? [],
    bookmarks: bookmarksRes.data ?? [],
    seguindo: followingRes.data ?? [],
    seguidores: followersRes.data ?? [],
    inscricoes_push: pushSubsRes.data ?? [],
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `mural-amparo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
