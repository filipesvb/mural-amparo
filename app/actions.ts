"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { credentialsSchema, nicknameSchema } from "@/utils/validation";
import type { PostWithRelations } from "@/utils/types";
import { FEED_PAGE_SIZE, EDIT_WINDOW_MS } from "@/utils/feed";
import {
  POST_IMAGES_BUCKET,
  MAX_POST_IMAGE_BYTES,
  ALLOWED_POST_IMAGE_TYPES,
  postImageExtension,
} from "@/utils/storage";

export type SearchProfileHit = {
  nickname: string;
  avatar_seed: string | null;
};

export type SearchPostHit = {
  id: number;
  content: string;
  created_at: string;
  author_name: string;
  author_nickname: string | null;
  author_avatar_seed: string | null;
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
      .select("nickname, avatar_seed")
      .ilike("nickname", `%${q}%`)
      .not("nickname", "is", null)
      .order("nickname")
      .limit(3),
    supabase
      .from("posts")
      .select(
        `id, content, created_at, author_name,
         profiles (nickname, avatar_seed)`,
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
    profiles: { nickname: string | null; avatar_seed: string | null } | null;
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
    }));

  return {
    profiles: (profilesRes.data ?? []) as SearchProfileHit[],
    posts,
  };
}

export async function loadMorePosts(
  beforeCreatedAt: string,
): Promise<PostWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles (nickname, avatar_seed),
      likes (user_id),
      comments (*)
    `,
    )
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (error) {
    console.error("Erro ao carregar mais posts:", error);
    return [];
  }
  return (data ?? []) as PostWithRelations[];
}

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para postar." };

  const content = ((formData.get("content") as string) ?? "").trim();
  const author_name = formData.get("author_name") as string; // Mantemos por segurança/legado

  const imageFile = formData.get("image");
  const hasImage = imageFile instanceof File && imageFile.size > 0;

  if (!content && !hasImage)
    return { error: "Escreva um recado ou anexe uma imagem." };

  let image_path: string | null = null;

  if (hasImage) {
    const file = imageFile as File;

    if (
      !(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)
    ) {
      return { error: "Formato inválido. Use JPG, PNG, WebP ou GIF." };
    }
    if (file.size > MAX_POST_IMAGE_BYTES) {
      return { error: "Imagem muito grande. O limite é 5 MB." };
    }

    const ext = postImageExtension(file.type)!;
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(POST_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      console.error("Erro ao subir imagem:", uploadError);
      return { error: "Não foi possível enviar a imagem." };
    }

    image_path = path;
  }

  const { error } = await supabase.from("posts").insert([
    {
      content,
      author_name,
      user_id: user.id,
      image_path,
    },
  ]);

  if (error) {
    console.error("Erro ao postar:", error);
    // Não deixa arquivo órfão se o insert falhou após o upload
    if (image_path) {
      await supabase.storage.from(POST_IMAGES_BUCKET).remove([image_path]);
    }
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

export async function toggleLike(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Verifica se o like já existe
  const { data: existingLike } = await supabase
    .from("likes")
    .select()
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existingLike) {
    await supabase.from("likes").delete().eq("id", existingLike.id);
  } else {
    await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
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
    .select("user_id, image_path")
    .eq("id", postId)
    .single();
  if (!post) return { error: "Recado não encontrado." };
  if (post.user_id !== user.id)
    return { error: "Você não pode excluir este recado." };

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    console.error("Erro ao excluir recado:", error);
    return { error: "Não foi possível excluir o recado." };
  }

  // Remove o arquivo do Storage depois que a linha some (best-effort)
  if (post.image_path) {
    await supabase.storage
      .from(POST_IMAGES_BUCKET)
      .remove([post.image_path]);
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
  if (comment.user_id !== user.id)
    return { error: "Você não pode excluir este comentário." };

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado para comentar." };

  const postId = formData.get("post_id");
  const content = formData.get("content") as string;

  if (!content) return { error: "O comentário não pode estar vazio." };

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
  });

  if (error) {
    console.error("Erro ao comentar:", error);
    return { error: "Não foi possível enviar o comentário." };
  }

  revalidatePath("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const rawNickname = (formData.get("nickname") as string).trim();
  const avatar_seed = (formData.get("avatar_seed") as string).trim();

  const parsed = nicknameSchema.safeParse(rawNickname);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const nickname = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      nickname,
      avatar_seed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("unique constraint")) {
      return { error: "Este apelido já está em uso." };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  redirect(`/perfil/${encodeURIComponent(nickname)}`);
}
