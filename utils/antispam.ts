// Anti-spam: constantes e helpers puros (sem import server-only — pode ser
// usado tanto no client, p/ o campo honeypot, quanto no server action).
// A contagem de rate limit em si fica no actions.ts (usa o supabase já lá).

// Nome plausível pra atrair bot que preenche tudo; nenhum humano vê/preenche.
export const HONEYPOT_FIELD = "website";

// Rigor "equilibrado": barra flood sem incomodar morador ativo.
// Ajuste estes números aqui se precisar afrouxar/apertar.
export const RATE_LIMIT = {
  post: { max: 5, windowMs: 5 * 60 * 1000, label: "recados" },
  comment: { max: 10, windowMs: 5 * 60 * 1000, label: "comentários" },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMIT;

// Bot que preencheu o campo escondido => descartar silenciosamente.
export function isHoneypotTripped(formData: FormData): boolean {
  const v = formData.get(HONEYPOT_FIELD);
  return typeof v === "string" && v.trim() !== "";
}

export function rateLimitMessage(
  label: string,
  retryAfterSec: number,
): string {
  const mins = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Você está enviando ${label} rápido demais. Aguarde ~${mins} min e tente de novo.`;
}
