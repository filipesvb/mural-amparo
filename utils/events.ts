// Helpers puros da agenda (sem import server-only) — usados na sidebar, na
// página /eventos e na combinação data+hora da action.

// Fuso de Amparo: o servidor da Vercel roda em UTC, então formatar sem fixar
// o timezone jogaria o dia/hora pra outro valor. Tudo da agenda é exibido
// neste fuso.
export const APP_TZ = "America/Sao_Paulo";

// O Brasil não usa mais horário de verão desde 2019, então Amparo é UTC-03:00
// fixo. A action carimba a hora informada com este offset pra gravar o
// instante UTC certo (servidor da Vercel roda em UTC).
export const APP_UTC_OFFSET = "-03:00";

// Quantos eventos a sidebar "Próximos eventos" mostra (resumo).
export const SIDEBAR_EVENTS_LIMIT = 4;

// Início do dia de hoje (no fuso do app) em ISO — corte do ".gte('starts_at')"
// pra esconder eventos que já passaram sem perder os de hoje mais cedo.
export function startOfTodayISO(): string {
  const now = new Date();
  const ymd = now.toLocaleDateString("en-CA", { timeZone: APP_TZ }); // YYYY-MM-DD
  return new Date(`${ymd}T00:00:00`).toISOString();
}

// "23" / "MAI" pro selo de data da sidebar.
export function eventDayBadge(startsAt: string): { day: string; month: string } {
  const d = new Date(startsAt);
  const day = d.toLocaleDateString("pt-BR", {
    timeZone: APP_TZ,
    day: "2-digit",
  });
  const month = d
    .toLocaleDateString("pt-BR", { timeZone: APP_TZ, month: "short" })
    .replace(".", "")
    .toUpperCase();
  return { day, month };
}

// "23 de maio · 8h" — linha legível na página /eventos.
export function formatEventWhen(startsAt: string): string {
  const d = new Date(startsAt);
  const date = d.toLocaleDateString("pt-BR", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "long",
  });
  const time = d.toLocaleTimeString("pt-BR", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}
