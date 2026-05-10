"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  // Pegamos o usuário logado para salvar o ID dele no post
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const content = formData.get("content") as string;
  const author_name = formData.get("author_name") as string; // Mantemos por segurança/legado

  if (!content) return;

  const { error } = await supabase.from("posts").insert([
    {
      content,
      author_name,
      user_id: user.id, // O elo que faltava!
    },
  ]);

  if (error) {
    console.error("Erro ao postar:", error);
    return;
  }

  revalidatePath("/");
}

export async function authenticate(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "E-mail e senha são obrigatórios" };

  // Tentamos cadastrar primeiro. Se o e-mail já existe, o Supabase devolve
  // "User already registered" e aí sim tentamos o login.
  // Mensagens são genéricas no caminho de erro para evitar enumeração de contas
  // (não revelar se um e-mail está ou não cadastrado).
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    if (signUpError.message.includes("User already registered")) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        return { error: "E-mail ou senha incorretos." };
      }
    } else {
      return { error: signUpError.message };
    }
  }

  // Logou ou cadastrou com sucesso
  revalidatePath("/");
  redirect("/");
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

export async function addComment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const postId = formData.get("post_id");
  const content = formData.get("content") as string;

  if (!content) return;

  // Mantém consistência com posts: nickname do perfil > prefixo do e-mail > "Morador"
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  const authorName =
    profile?.nickname || user.email?.split("@")[0] || "Morador";

  await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    content,
    author_name: authorName,
  });

  revalidatePath("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  const nickname = formData.get("nickname") as string;
  const avatar_seed = formData.get("avatar_seed") as string;

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
  redirect("/");
}
