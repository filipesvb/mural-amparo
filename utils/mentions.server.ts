// Server-only: usa next/headers via createClient. Nunca importar em Client Components.
import { createClient } from "@/utils/supabase/server";

export async function fetchValidMentions(nicks: string[]): Promise<string[]> {
  if (nicks.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("nickname")
    .in("nickname", nicks);
  return (data ?? []).map((p) => p.nickname as string);
}
