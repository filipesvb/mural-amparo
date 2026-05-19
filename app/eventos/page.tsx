import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { signOut } from "@/app/actions";
import SuggestEventForm from "@/components/SuggestEventForm";
import EventReviewQueue from "@/components/EventReviewQueue";
import DeleteEventButton from "@/components/DeleteEventButton";
import { asRole, canModerate } from "@/utils/roles";
import {
  eventDayBadge,
  formatEventWhen,
  startOfTodayISO,
} from "@/utils/events";
import type { CityEvent, CityEventWithAuthor } from "@/utils/types";

export default async function EventosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Página pública: visitante vê os eventos aprovados; logado também sugere.
  let isStaff = false;
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isStaff = canModerate(asRole(me?.role));
  }

  // Agenda pública: só aprovados e que ainda não passaram (a RLS já barraria
  // os não-aprovados, mas filtramos explícito pela clareza/índice).
  const { data: approvedData } = await supabase
    .from("events")
    .select("*")
    .eq("status", "aprovado")
    .gte("starts_at", startOfTodayISO())
    .order("starts_at", { ascending: true });
  const approved = (approvedData ?? []) as CityEvent[];

  // Fila de moderação — só staff. O embed suggester:profiles!created_by
  // segue a mesma convenção de notifications.actor_id.
  let pending: CityEventWithAuthor[] = [];
  if (isStaff) {
    const { data: pendingData } = await supabase
      .from("events")
      .select(
        `*, suggester:profiles!created_by (nickname, avatar_seed, avatar_path)`,
      )
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    pending = (pendingData ?? []) as unknown as CityEventWithAuthor[];
  }

  return (
    <main className="min-h-screen p-3 md:p-6 flex justify-center">
      <div className="w-full max-w-3xl bg-mural-creme border border-mural-line rounded-2xl shadow-md flex flex-col overflow-hidden self-start">
        <header className="wood-header-footer shrink-0 px-5 py-4 flex justify-between items-center text-mural-creme">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold"
            >
              ← Mural
            </Link>
            <h1 className="text-lg mural-title text-mural-creme">
              📅 Agenda da cidade
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 text-xs font-bold rounded-lg"
                >
                  Sair
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 text-xs font-bold rounded-lg"
              >
                Entrar
              </Link>
            )}
          </div>
        </header>

        <section className="bg-mural-panel/60 border-b border-mural-line px-6 py-4">
          <p className="text-sm text-mural-ink/70">
            Eventos abertos de Amparo. Qualquer morador pode{" "}
            <strong>sugerir</strong> — a equipe revisa antes de publicar na
            agenda, então nada entra no ar direto.
          </p>
        </section>

        <section className="flex-1 p-4 space-y-6">
          <SuggestEventForm isLoggedIn={!!user} />

          {isStaff && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-mural-ink/60 flex items-center gap-2">
                🛡️ Aguardando aprovação
                {pending.length > 0 && (
                  <span className="bg-mural-brown text-white text-[10px] px-2 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
              </h2>
              <EventReviewQueue events={pending} />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-mural-ink/60">
              Próximos eventos
            </h2>

            {approved.length === 0 ? (
              <div className="text-center p-8 text-mural-ink/40 italic">
                Nenhum evento na agenda ainda. Que tal sugerir o primeiro?
              </div>
            ) : (
              <ul className="space-y-3">
                {approved.map((ev) => {
                  const { day, month } = eventDayBadge(ev.starts_at);
                  return (
                    <li
                      key={ev.id}
                      className="soft-card p-4 flex items-start gap-4"
                    >
                      <div className="bg-mural-creme border border-mural-line rounded-lg w-14 text-center py-2 shrink-0">
                        <div className="text-xl font-extrabold text-mural-ink leading-none">
                          {day}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-mural-ink/50 mt-1">
                          {month}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-mural-ink">
                            {ev.title}
                          </p>
                          {isStaff && <DeleteEventButton eventId={ev.id} />}
                        </div>
                        <p className="text-xs text-mural-ink/55">
                          {formatEventWhen(ev.starts_at)} · {ev.location}
                        </p>
                        {ev.description && (
                          <p className="text-sm text-mural-ink/80 mt-2 whitespace-pre-wrap">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <footer className="wood-header-footer shrink-0 p-5 text-center text-mural-creme">
          <p className="text-[10px] opacity-70">© 2026 · Conectando Amparo</p>
        </footer>
      </div>
    </main>
  );
}
