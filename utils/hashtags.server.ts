// Server-only: usa next/headers via createClient. Nunca importar em Client Components.
import { createClient } from "@/utils/supabase/server";
import { HASHTAG_REGEX, canonicalTag } from "@/utils/hashtags";

// Hashtags mais usadas em posts recentes (barato: tally em JS sobre os
// últimos N posts; suficiente pro volume de um mural de bairro).
export async function fetchTrendingHashtags(
  limit = 6,
): Promise<{ tag: string; count: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(200);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const content = (row as { content: string }).content ?? "";
    const seen = new Set<string>();
    for (const m of content.matchAll(HASHTAG_REGEX)) {
      const tag = canonicalTag(m[1]);
      if (seen.has(tag)) continue; // conta 1x por post
      seen.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
