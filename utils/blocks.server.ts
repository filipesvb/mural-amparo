import { createClient } from "@/utils/supabase/server";

// IDs que o usuário X bloqueou — usado pra filtrar o feed e listagens.
// Tabela `blocks` tem RLS que só deixa o próprio blocker ler suas linhas,
// então essa consulta retorna [] pra qualquer sessão fora da do `userId`.
// Quem chama deve passar `userId` do morador autenticado.
export async function fetchBlockedIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  return (data ?? []).map((r) => (r as { blocked_id: string }).blocked_id);
}

// Helper pra montar o filtro `user_id NOT IN (...)` no PostgREST. Retorna a
// string formatada se houver IDs; null se a lista está vazia (sem filtro).
export function blockedNotInFilter(ids: string[]): string | null {
  if (ids.length === 0) return null;
  // PostgREST espera UUIDs entre aspas dentro do parêntese.
  return `(${ids.map((id) => `"${id}"`).join(",")})`;
}
