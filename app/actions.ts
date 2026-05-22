"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import {
  credentialsSchema,
  nicknameSchema,
  eventSchema,
} from "@/utils/validation";
import type { PostWithRelations } from "@/utils/types";
import { FEED_PAGE_SIZE, EDIT_WINDOW_MS } from "@/utils/feed";
import {
  POST_IMAGES_BUCKET,
  AVATARS_BUCKET,
  isOwnedImagePath,
  ownedImagePaths,
} from "@/utils/storage";
import { isReactionEmoji, type ReactionEmoji } from "@/utils/reactions";
import { asRole, canModerate, isAdmin } from "@/utils/roles";
import {
  RATE_LIMIT,
  isHoneypotTripped,
  rateLimitMessage,
} from "@/utils/antispam";
import {
  isPostCategory,
  DEFAULT_CATEGORY,
  type PostCategory,
} from "@/utils/categories";
import { fetchFollowingIds } from "@/utils/follows.server";
import { APP_UTC_OFFSET } from "@/utils/events";

export type SearchProfileHit = {
  nickname: string;
  avatar_seed: string | null;
  avatar_path: string | null;
};

export type SearchPostHit = {
  id: number;
  content: string;
  created_at: string;
  author_name: string;
  author_nickname: string | null;
  author_avatar_seed: string | null;
  author_avatar_path: string | null;
};

export type SearchResults = {
  profiles: SearchProfileHit[];
  posts: SearchPostHit[];
};

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { profiles: [], posts: [] };

  const supabase = await createClient();

  const [profilesRes, postsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("nickname, avatar_seed, avatar_path")
      .ilike("nickname", `%${q}%`)
      .not("nickname", "is", null)
      .order("nickname")
      .limit(3),
    supabase
      .from("posts")
      .select(
        `id, content, created_at, author_name,
         profiles (nickname, avatar_seed, avatar_path)`,
      )
      .textSearch("search", q, { type: "websearch", config: "portuguese" })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  type RawPost = {
    id: number;
    content: string;
    created_at: string;
    author_name: string;
    profiles: {
      nickname: string | null;
      avatar_seed: string | null;
      avatar_path: string | null;
    } | null;
  };

  const posts: SearchPostHit[] = (
    (postsRes.data ?? []) as unknown as RawPost[]
  ).map((p) => ({
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      author_name: p.author_name,
      author_nickname: p.profiles?.nickname ?? null,
      author_avatar_seed: p.profiles?.avatar_seed ?? null,
      author_avatar_path: p.profiles?.avatar_path ?? null,
    }));

  return {
    profiles: (profilesRes.data ?? []) as SearchProfileHit[],
    posts,
  };
}

export async function loadMorePosts(
  beforeCreatedAt: string,
  category?: PostCategory | null,
  feed?: "seguindo" | null,
): Promise<PostWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
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
    .lt("created_at", beforeCreatedAt);

  if (feed === "seguindo") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const followingIds = await fetchFollowingIds(user.id);
    if (followingIds.length === 0) return [];
    query = query.in("user_id", followingIds);
  }

  if (category) query = query.eq("category", category);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (error) {
    console.error("Erro ao carregar mais posts:", error);
    return [];
  }
  return (data ?? []) as PostWithRelations[];
}

// Rate limit baseado nas próprias tabelas (confiável em serverless, sem
// estado em memória): conta quantas linhas o usuário criou na janela.
async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "posts" | "comments" | "events",
  userId: string,
  cfg: { max: number; windowMs: number },
  ownerColumn: string = "user_id",
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const cutoff = new Date(Date.now() - cfg.windowMs).toISOString();
  const { data } = await supabase
    .from(table)
    .select("created_at")
    .eq(ownerColumn, userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(cfg.max + 5);
  const rows = (data ?? []) as { created_at: string }[];
  if (rows.length < cfg.max) return { limited: false, retryAfterSec: 0 };
  const oldest = new Date(rows[0].created_at).getTime();
  const retryAfterSec = Math.max(
    1,
    Math.ceil((cfg.windowMs - (Date.now() - oldest)) / 1000),
  );
  return { limited: true, retryAfterSec };
}

export async function createPost(formData: FormData) {
  // Bot que caiu no campo isca: finge sucesso e não grava nada.
  if (isHoneypotTripped(formData)) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para postar." };

  const content = ((formData.get("content") as string) ?? "").trim();
  const author_name = formData.get("author_name") as string; // Mantemos por segurança/legado

  const categoryRaw = formData.get("category");
  const category = isPostCategory(categoryRaw) ? categoryRaw : DEFAULT_CATEGORY;

  // As imagens já subiram pro Storage no navegador (ver
  // utils/upload.client.ts); aqui chegam só os caminhos. Validamos que todos
  // pertencem à pasta do próprio usuário — a RLS do bucket é a barreira
  // definitiva.
  const imagePathsRaw = formData.getAll("image_paths");
  const image_paths = ownedImagePaths(imagePathsRaw, user.id);
  if (image_paths === null) {
    return { error: "Imagem inválida. Tente enviar novamente." };
  }

  if (!content && image_paths.length === 0)
    return { error: "Escreva um recado ou anexe uma imagem." };

  const postRate = await checkRateLimit(
    supabase,
    "posts",
    user.id,
    RATE_LIMIT.post,
  );
  if (postRate.limited) {
    return {
      error: rateLimitMessage(RATE_LIMIT.post.label, postRate.retryAfterSec),
    };
  }

  const { error } = await supabase.from("posts").insert([
    {
      content,
      author_name,
      user_id: user.id,
      image_paths,
      category,
    },
  ]);

  if (error) {
    console.error("Erro ao postar:", error);
    return { error: "Não foi possível publicar o recado." };
  }

  revalidatePath("/");
}

export async function authenticate(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const supabase = await createClient();

  // Monta o origin para o link de confirmação por e-mail
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const emailRedirectTo = `${proto}://${host}/auth/confirm`;

  // Tenta login primeiro. O Supabase moderno, por proteção anti-enumeração, não
  // retorna mais "User already registered" no signUp de contas confirmadas —
  // então signUp-primeiro mandaria e-mail à toa pra quem só quer entrar.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) {
    revalidatePath("/");
    redirect("/");
  }
  if (signInError.message.toLowerCase().includes("email not confirmed")) {
    return {
      error:
        "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
    };
  }

  // Login falhou com credenciais inválidas: pode ser conta inexistente (cadastrar)
  // OU senha errada (já existe). signUp diferencia via identities vazias.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (signUpError) {
    return { error: "E-mail ou senha incorretos." };
  }
  // Anti-enumeração: identities vazias = conta já existe → era senha errada.
  if (signUpData.user && signUpData.user.identities?.length === 0) {
    return { error: "E-mail ou senha incorretos." };
  }
  if (!signUpData.session) {
    return {
      info: "Enviamos um link de confirmação para seu e-mail. Clique nele para entrar no Mural.",
    };
  }

  // Conta criada com sessão imediata (caso confirmação esteja desligada no Supabase)
  revalidatePath("/");
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = z
    .email("E-mail inválido")
    .safeParse(formData.get("email"));
  if (!email.success) {
    return { error: email.error.issues[0].message };
  }

  const supabase = await createClient();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const redirectTo = `${proto}://${host}/auth/confirm?next=/redefinir-senha`;

  // O Supabase, por padrão, não vaza se o e-mail existe — devolve sucesso
  // independente. Mantemos resposta genérica do nosso lado também.
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo });

  return {
    info: "Se a conta existir, enviamos um link de redefinição para o e-mail informado.",
  };
}

export async function updatePassword(formData: FormData) {
  const password = z
    .string()
    .min(6, "Senha deve ter ao menos 6 caracteres")
    .safeParse(formData.get("password"));
  if (!password.success) {
    return { error: password.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Sessão expirada. Clique de novo no link enviado por e-mail.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: password.data,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}

export async function markNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
}

export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };
  if (user.id === targetUserId)
    return { error: "Você não pode seguir a si mesmo." };

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetUserId });
  }

  revalidatePath("/");
}

// Inscrição do Push API serializada (JSON.parse(JSON.stringify(sub))).
export type SerializedPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  sub: SerializedPushSubscription,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Inscrição de push inválida." };
  }

  // Upsert por endpoint: o mesmo device re-assinando não duplica linha
  // (e troca de dono se a pessoa logar com outra conta no mesmo navegador).
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      user_id: user.id,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("Erro ao salvar inscrição de push:", error);
    return { error: "Não foi possível ativar as notificações." };
  }
  return { success: true };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };
  if (!endpoint) return { error: "Inscrição inválida." };

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  return { success: true };
}

export async function toggleBookmark(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
  } else {
    await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, post_id: postId });
  }

  // Sem revalidatePath("/"): o feed guarda os posts em estado client e o
  // botão alterna otimista. Só a página de salvos precisa refletir.
  revalidatePath("/perfil/salvos");
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erro ao sair:", error.message);
    return;
  }

  // Limpa o cache e manda o usuário para a home
  revalidatePath("/");
  redirect("/");
}

export async function setReaction(postId: number, emoji: ReactionEmoji) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (!isReactionEmoji(emoji)) return;

  // Reação atual do morador neste recado (no máx. uma — unique post_id+user_id)
  const { data: existing } = await supabase
    .from("reactions")
    .select("id, emoji")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    await supabase
      .from("reactions")
      .insert({ post_id: postId, user_id: user.id, emoji });
  } else if (existing.emoji === emoji) {
    // Mesmo emoji => toggle off
    await supabase.from("reactions").delete().eq("id", existing.id);
  } else {
    // Troca de emoji => update (não gera notificação nova)
    await supabase
      .from("reactions")
      .update({ emoji })
      .eq("id", existing.id);
  }

  revalidatePath("/");
}

export async function editPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const postId = Number(formData.get("post_id"));
  const content = (formData.get("content") as string)?.trim();
  if (!postId) return { error: "Recado inválido." };
  if (!content) return { error: "O recado não pode estar vazio." };

  const { data: post } = await supabase
    .from("posts")
    .select("user_id, created_at")
    .eq("id", postId)
    .single();
  if (!post) return { error: "Recado não encontrado." };
  if (post.user_id !== user.id)
    return { error: "Você não pode editar este recado." };
  if (Date.now() - new Date(post.created_at).getTime() > EDIT_WINDOW_MS)
    return { error: "Janela de edição expirou (5 minutos)." };

  const { error } = await supabase
    .from("posts")
    .update({ content })
    .eq("id", postId);
  if (error) {
    console.error("Erro ao editar recado:", error);
    return { error: "Não foi possível salvar a edição." };
  }

  revalidatePath("/");
}

export async function deletePost(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const { data: post } = await supabase
    .from("posts")
    .select("user_id, image_paths")
    .eq("id", postId)
    .single();
  if (!post) return { error: "Recado não encontrado." };
  if (post.user_id !== user.id) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!canModerate(asRole(me?.role)))
      return { error: "Você não pode excluir este recado." };
  }

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    console.error("Erro ao excluir recado:", error);
    return { error: "Não foi possível excluir o recado." };
  }

  // Remove os arquivos do Storage depois que a linha some (best-effort).
  // A RLS de DELETE em storage.objects não retorna erro quando bloqueia:
  // o Supabase só devolve data: [] (zero objetos removidos). Por isso
  // checamos o data, não só o error.
  const imagePaths = (post.image_paths ?? []) as string[];
  if (imagePaths.length > 0) {
    const { data: removed, error: removeError } = await supabase.storage
      .from(POST_IMAGES_BUCKET)
      .remove(imagePaths);
    if (removeError || !removed || removed.length === 0) {
      console.error(
        "Falha ao remover imagens do Storage (verifique a policy de DELETE):",
        imagePaths,
        removeError,
      );
    }
  }

  revalidatePath("/");
}

export async function editComment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const commentId = Number(formData.get("comment_id"));
  const content = (formData.get("content") as string)?.trim();
  if (!commentId) return { error: "Comentário inválido." };
  if (!content) return { error: "O comentário não pode estar vazio." };

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id, created_at")
    .eq("id", commentId)
    .single();
  if (!comment) return { error: "Comentário não encontrado." };
  if (comment.user_id !== user.id)
    return { error: "Você não pode editar este comentário." };
  if (Date.now() - new Date(comment.created_at).getTime() > EDIT_WINDOW_MS)
    return { error: "Janela de edição expirou (5 minutos)." };

  const { error } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", commentId);
  if (error) {
    console.error("Erro ao editar comentário:", error);
    return { error: "Não foi possível salvar a edição." };
  }

  revalidatePath("/");
}

export async function deleteComment(commentId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .single();
  if (!comment) return { error: "Comentário não encontrado." };
  if (comment.user_id !== user.id) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!canModerate(asRole(me?.role)))
      return { error: "Você não pode excluir este comentário." };
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);
  if (error) {
    console.error("Erro ao excluir comentário:", error);
    return { error: "Não foi possível excluir o comentário." };
  }

  revalidatePath("/");
}

export async function addComment(formData: FormData) {
  // Bot que caiu no campo isca: finge sucesso e não grava nada.
  if (isHoneypotTripped(formData)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para comentar." };

  const postId = formData.get("post_id");
  const content = formData.get("content") as string;

  const parentRaw = formData.get("parent_comment_id");
  const parentId =
    parentRaw && Number(parentRaw) ? Number(parentRaw) : null;

  if (!content) return { error: "O comentário não pode estar vazio." };

  const commentRate = await checkRateLimit(
    supabase,
    "comments",
    user.id,
    RATE_LIMIT.comment,
  );
  if (commentRate.limited) {
    return {
      error: rateLimitMessage(
        RATE_LIMIT.comment.label,
        commentRate.retryAfterSec,
      ),
    };
  }

  // Mantém consistência com posts: nickname do perfil > prefixo do e-mail > "Morador"
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  const authorName =
    profile?.nickname || user.email?.split("@")[0] || "Morador";

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    content,
    author_name: authorName,
    parent_comment_id: parentId,
  });

  if (error) {
    console.error("Erro ao comentar:", error);
    return { error: "Não foi possível enviar o comentário." };
  }

  revalidatePath("/");
}

// Limite duro de bio (combina com o CHECK constraint em profiles).
const BIO_MAX = 280;

function parseBio(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, BIO_MAX);
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const rawNickname = (formData.get("nickname") as string).trim();
  const avatar_seed = (formData.get("avatar_seed") as string).trim();
  const bio = parseBio(formData.get("bio"));

  const parsed = nicknameSchema.safeParse(rawNickname);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const nickname = parsed.data;

  // Foto de perfil: caminho atual (pra apagar o arquivo antigo ao trocar/remover)
  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  const oldAvatarPath: string | null = current?.avatar_path ?? null;

  const removeAvatar = formData.get("remove_avatar") === "1";
  // A foto já subiu pro Storage no navegador; aqui chega só o caminho.
  const newAvatarPathRaw = formData.get("avatar_path");
  const newAvatarPath = isOwnedImagePath(newAvatarPathRaw, user.id)
    ? newAvatarPathRaw
    : null;
  if (newAvatarPathRaw && !newAvatarPath) {
    return { error: "Imagem inválida. Tente enviar novamente." };
  }

  // undefined = não mexe no avatar_path; null = remover; string = nova foto
  let avatar_path: string | null | undefined = undefined;
  if (newAvatarPath) {
    avatar_path = newAvatarPath;
  } else if (removeAvatar) {
    avatar_path = null;
  }

  const updatePayload: {
    nickname: string;
    avatar_seed: string;
    bio: string | null;
    updated_at: string;
    avatar_path?: string | null;
  } = { nickname, avatar_seed, bio, updated_at: new Date().toISOString() };
  if (avatar_path !== undefined) updatePayload.avatar_path = avatar_path;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("unique constraint")) {
      return { error: "Este apelido já está em uso." };
    }
    return { error: error.message };
  }

  // Trocou ou removeu a foto: apaga o arquivo antigo (best-effort)
  if (
    oldAvatarPath &&
    avatar_path !== undefined &&
    oldAvatarPath !== avatar_path
  ) {
    await supabase.storage.from(AVATARS_BUCKET).remove([oldAvatarPath]);
  }

  revalidatePath("/");
  redirect(`/perfil/${encodeURIComponent(nickname)}`);
}

// Troca de senha pra usuário JÁ logado (diferente do `updatePassword`, que
// roda no fluxo de redefinição via link de e-mail). Exige a senha atual pra
// blindar de session-hijack: se o invasor não souber a senha antiga, não
// consegue trocar e travar o dono fora. Por segurança, ao trocar com sucesso
// derruba as outras sessões — esta sessão continua válida no dispositivo
// atual.
export async function changeMyPassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Não autorizado" };

  const currentPassword = (formData.get("current_password") as string) ?? "";
  const newPasswordRaw = (formData.get("new_password") as string) ?? "";

  const parsed = z
    .string()
    .min(6, "A nova senha deve ter ao menos 6 caracteres")
    .safeParse(newPasswordRaw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const newPassword = parsed.data;

  if (newPassword === currentPassword) {
    return { error: "A nova senha precisa ser diferente da atual." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Senha atual incorreta." };

  const { error: updError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updError) return { error: updError.message };

  // Derruba outras sessões (outros dispositivos/abas). A sessão atual continua.
  await supabase.auth.signOut({ scope: "others" });

  return { info: "Senha atualizada. As outras sessões foram desconectadas." };
}

// Pedido de troca de e-mail. Supabase manda automaticamente um link de
// confirmação pro novo endereço — o e-mail só muda depois que o morador
// clicar nesse link (que cai em /auth/confirm via exchangeCodeForSession).
// Exige a senha atual pra evitar troca em sessão sequestrada.
export async function changeMyEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Não autorizado" };

  const newEmailParsed = z
    .email("E-mail inválido")
    .safeParse(formData.get("new_email"));
  if (!newEmailParsed.success) {
    return { error: newEmailParsed.error.issues[0].message };
  }
  const newEmail = newEmailParsed.data.toLowerCase();
  if (newEmail === user.email.toLowerCase()) {
    return { error: "Este já é o seu e-mail atual." };
  }

  const currentPassword = (formData.get("current_password") as string) ?? "";
  if (!currentPassword) return { error: "Informe sua senha pra confirmar." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Senha incorreta." };

  // Supabase dispara o e-mail de confirmação automaticamente. O link usa a
  // Site URL configurada no painel, então cai em /auth/confirm.
  const { error: updError } = await supabase.auth.updateUser({
    email: newEmail,
  });
  if (updError) return { error: updError.message };

  return {
    info: `Enviamos um link de confirmação pra ${newEmail}. Clique nele pra finalizar a troca — até lá, seu e-mail continua sendo o atual.`,
  };
}

// Desconecta o morador de TODAS as sessões (todos os dispositivos, inclusive
// esta). Útil quando suspeita de acesso indevido. Redirect pro login com nota.
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/");
  redirect("/login?info=desconectado-tudo");
}

// Exclusão definitiva da conta (direito LGPD ao esquecimento). Re-autentica
// pela senha pra blindar de cliques acidentais e session-hijack, depois usa
// a service role pra apagar o usuário em auth.users — o cascade nas FKs cuida
// das tabelas (posts, comments, reactions, bookmarks, follows, etc.). Files
// do Storage não cascateiam, então listamos e removemos antes.
export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Não autorizado" };

  const password = (formData.get("password") as string) ?? "";
  if (!password) {
    return { error: "Informe sua senha pra confirmar." };
  }
  const confirmation = ((formData.get("confirmation") as string) ?? "").trim();
  if (confirmation !== "EXCLUIR") {
    return { error: 'Digite "EXCLUIR" em maiúsculas pra confirmar.' };
  }

  // Re-autenticação: tentar logar com a senha enviada confirma intenção
  // mesmo numa sessão já aberta.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (reauthError) {
    return { error: "Senha incorreta." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("deleteAccount: SUPABASE_SERVICE_ROLE_KEY ausente.");
    return { error: "Configuração ausente. Tente novamente em instantes." };
  }
  const admin = createServiceRoleClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Storage cleanup — best-effort. Falhas aqui não bloqueiam a exclusão da
  // conta (o usuário tem direito a sair); arquivos órfãos ficam pra rotina
  // de manutenção. Service role enxerga o bucket inteiro.
  try {
    const { data: ownPosts } = await admin
      .from("posts")
      .select("image_paths")
      .eq("user_id", user.id);
    const postImagePaths: string[] = [];
    for (const row of ownPosts ?? []) {
      const paths = (row as { image_paths: string[] | null }).image_paths;
      if (Array.isArray(paths)) postImagePaths.push(...paths);
    }
    if (postImagePaths.length > 0) {
      await admin.storage.from(POST_IMAGES_BUCKET).remove(postImagePaths);
    }

    const { data: profileRow } = await admin
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .single();
    const avatarPath = (profileRow as { avatar_path: string | null } | null)
      ?.avatar_path;
    if (avatarPath) {
      await admin.storage.from(AVATARS_BUCKET).remove([avatarPath]);
    }
  } catch (err) {
    console.error("deleteAccount: falha ao limpar Storage:", err);
  }

  // Exclusão definitiva — cascade nas FKs (auth.users → profiles → posts/etc.)
  // remove tudo associado em uma transação.
  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) {
    console.error("deleteAccount: admin.deleteUser falhou:", delError);
    return { error: "Não foi possível excluir agora. Tente novamente." };
  }

  // signOut local pra invalidar cookies antes do redirect.
  await supabase.auth.signOut();

  revalidatePath("/");
  redirect("/login?info=conta-excluida");
}

// Conclusão do fluxo de boas-vindas (/bem-vindo). Difere do updateProfile
// em três pontos: (1) marca onboarded_at; (2) redireciona pra home em vez
// do perfil; (3) usa o próprio nickname como avatar_seed default quando o
// morador não escolheu nenhuma.
export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const rawNickname = (formData.get("nickname") as string).trim();
  const bio = parseBio(formData.get("bio"));

  const parsed = nicknameSchema.safeParse(rawNickname);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const nickname = parsed.data;

  // Foto: mesmo padrão do updateProfile — upload já aconteceu no cliente.
  const newAvatarPathRaw = formData.get("avatar_path");
  const newAvatarPath = isOwnedImagePath(newAvatarPathRaw, user.id)
    ? newAvatarPathRaw
    : null;
  if (newAvatarPathRaw && !newAvatarPath) {
    return { error: "Imagem inválida. Tente enviar novamente." };
  }

  const updatePayload: {
    nickname: string;
    avatar_seed: string;
    bio: string | null;
    onboarded_at: string;
    updated_at: string;
    avatar_path?: string;
  } = {
    nickname,
    avatar_seed: nickname,
    bio,
    onboarded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (newAvatarPath) updatePayload.avatar_path = newAvatarPath;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("unique constraint")) {
      return { error: "Este apelido já está em uso. Escolha outro." };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}

// Promove/rebaixa um morador. Só admin. Pela UI o papel só transita entre
// 'morador' e 'moderador' — virar/sair de 'admin' é só por SQL (evita
// escalonamento e lockout). Admin não pode ter o papel mexido pela interface.
export async function setUserRole(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!isAdmin(asRole(me?.role))) {
    return { error: "Apenas administradores podem gerenciar papéis." };
  }

  const targetId = (formData.get("target_id") as string) ?? "";
  const newRole = formData.get("role");
  if (!targetId) return { error: "Usuário inválido." };
  if (newRole !== "morador" && newRole !== "moderador") {
    return { error: "Papel inválido." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .single();
  if (!target) return { error: "Usuário não encontrado." };
  if (asRole(target.role) === "admin") {
    return { error: "Não é possível alterar um admin pela interface." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", targetId);
  if (error) {
    console.error("Erro ao alterar papel:", error);
    return { error: "Não foi possível alterar o papel." };
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

// Morador logado sugere um evento. Entra como 'pendente' — só vira público
// depois que a staff aprova em /eventos. Mesmo esqueleto de createPost
// (honeypot -> auth -> validação -> rate limit -> insert -> revalidate).
export async function suggestEvent(formData: FormData) {
  if (isHoneypotTripped(formData)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Você precisa estar logado para sugerir um evento." };
  }

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    date: formData.get("date"),
    time: formData.get("time"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { title, description, location, date, time } = parsed.data;

  // Hora informada é horário de Amparo; carimbamos o offset fixo pra gravar
  // o instante UTC correto.
  const startsAt = new Date(`${date}T${time}:00${APP_UTC_OFFSET}`);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Data ou horário inválidos." };
  }
  if (startsAt.getTime() < Date.now()) {
    return { error: "O evento precisa ser numa data futura." };
  }

  const rate = await checkRateLimit(
    supabase,
    "events",
    user.id,
    RATE_LIMIT.event,
    "created_by",
  );
  if (rate.limited) {
    return {
      error: rateLimitMessage(RATE_LIMIT.event.label, rate.retryAfterSec),
    };
  }

  const { error } = await supabase.from("events").insert([
    {
      title,
      description: description ? description : null,
      location,
      starts_at: startsAt.toISOString(),
      created_by: user.id,
      status: "pendente",
    },
  ]);
  if (error) {
    console.error("Erro ao sugerir evento:", error);
    return { error: "Não foi possível enviar o evento. Tente de novo." };
  }

  revalidatePath("/eventos");
  revalidatePath("/");
}

// Staff (moderador/admin) aprova ou recusa uma sugestão. Enforcement duplo:
// aqui na action e na policy "staff revisa evento" (RLS).
export async function reviewEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!canModerate(asRole(me?.role))) {
    return { error: "Apenas a equipe pode revisar eventos." };
  }

  const eventId = Number(formData.get("event_id"));
  if (!Number.isInteger(eventId)) return { error: "Evento inválido." };

  const decision = formData.get("decision");
  const status =
    decision === "aprovar"
      ? "aprovado"
      : decision === "recusar"
        ? "recusado"
        : null;
  if (!status) return { error: "Ação inválida." };

  const { error } = await supabase
    .from("events")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) {
    console.error("Erro ao revisar evento:", error);
    return { error: "Não foi possível revisar o evento." };
  }

  revalidatePath("/eventos");
  revalidatePath("/");
}

// O autor apaga a própria sugestão; staff apaga qualquer evento. A RLS
// (policies de delete) é a barreira definitiva — aqui só damos a mensagem.
export async function deleteEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const eventId = Number(formData.get("event_id"));
  if (!Number.isInteger(eventId)) return { error: "Evento inválido." };

  const { data: ev } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();
  if (!ev) return { error: "Evento não encontrado." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const canDelete =
    ev.created_by === user.id || canModerate(asRole(me?.role));
  if (!canDelete) {
    return { error: "Você não pode apagar este evento." };
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    console.error("Erro ao apagar evento:", error);
    return { error: "Não foi possível apagar o evento." };
  }

  revalidatePath("/eventos");
  revalidatePath("/");
}
