export const REACTION_EMOJIS = ["❤️", "😂", "😢", "🙏", "👍"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return (
    typeof value === "string" &&
    (REACTION_EMOJIS as readonly string[]).includes(value)
  );
}

type ReactionLike = { user_id: string; emoji: ReactionEmoji };

// Alterna a reação do morador (espelha o server action setReaction):
// sem reação → adiciona; mesmo emoji → remove; emoji diferente → troca.
// Usado quando o próprio usuário clica (ação local autoritativa).
export function applyReactionToggle<T extends ReactionLike>(
  list: T[],
  userId: string,
  emoji: ReactionEmoji,
): T[] {
  const existing = list.find((r) => r.user_id === userId);
  if (!existing) return [...list, { user_id: userId, emoji } as T];
  if (existing.emoji === emoji) {
    return list.filter((r) => r.user_id !== userId);
  }
  return list.map((r) =>
    r.user_id === userId ? { ...r, emoji } : r,
  );
}

// "Define" a reação do morador (idempotente): remove qualquer reação
// anterior dele e fixa esta. Usado para os ecos de Realtime INSERT/UPDATE
// — assim, mesmo que o eco chegue depois da ação local, não duplica.
export function setReactionFor<T extends ReactionLike>(
  list: T[],
  userId: string,
  emoji: ReactionEmoji,
): T[] {
  return [...list.filter((r) => r.user_id !== userId), { user_id: userId, emoji } as T];
}

// Remove a reação do morador (idempotente). Usado pelo eco de DELETE.
export function removeReactionFor<T extends ReactionLike>(
  list: T[],
  userId: string,
): T[] {
  return list.filter((r) => r.user_id !== userId);
}
