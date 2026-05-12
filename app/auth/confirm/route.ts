import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Agora buscamos o parâmetro 'code' em vez de 'token_hash'
  const code = searchParams.get("code");

  // Aceita apenas paths internos para evitar open redirect
  // (rejeita "//attacker.com", "/\\evil", URLs absolutas, etc.)
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/";

  if (code) {
    const supabase = await createClient();

    // Fazemos a troca segura do código pela sessão do usuário
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Deu tudo certo! Redireciona para a home limpa
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Erro na troca de código (PKCE):", error.message);
    }
  }

  // Se chegou aqui, não tinha código ou deu erro na troca
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "Link inválido ou expirado");
  return NextResponse.redirect(loginUrl);
}
