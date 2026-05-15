import type { PostWithRelations } from "@/utils/types";

// Mesma regex usada nos triggers de notificação (notas/creating_mentions_schema.md).
// Mantém ambos os lados em sincronia: se mudar aqui, atualizar o trigger também.
export const MENTION_REGEX = /@([A-Za-z0-9_]{2,30})/g;

export function extractMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_REGEX);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return [...set];
}

export function collectMentionsFromPosts(posts: PostWithRelations[]): string[] {
  const set = new Set<string>();
  for (const post of posts) {
    for (const nick of extractMentions(post.content)) set.add(nick);
    for (const comment of post.comments ?? []) {
      for (const nick of extractMentions(comment.content)) set.add(nick);
    }
  }
  return [...set];
}
