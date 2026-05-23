import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RoleManager from "@/components/RoleManager";
import ReportsQueue from "@/components/ReportsQueue";
import { asRole, canModerate, isAdmin } from "@/utils/roles";
import type { Report } from "@/utils/types";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // /admin: gerência de papéis (só admin) + fila de denúncias (staff = admin
  // ou moderador). Moderador pode resolver denúncia mas não promover ninguém.
  const role = asRole(me?.role);
  if (!canModerate(role)) redirect("/");
  const showAdminTools = isAdmin(role);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_seed, avatar_path, role")
    .order("role", { ascending: true })
    .order("nickname", { ascending: true })
    .limit(500);

  // Fila de denúncias abertas + apelido do denunciante (via 2ª query, evita
  // depender de hint de FK no PostgREST).
  const { data: reportRows } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "aberto")
    .order("created_at", { ascending: false })
    .limit(50);
  const reports = (reportRows ?? []) as Report[];
  const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));
  const { data: reporters } = reporterIds.length
    ? await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", reporterIds)
    : { data: [] };
  const nicknameById = new Map<string, string | null>(
    (reporters ?? []).map((p) => [
      (p as { id: string }).id,
      (p as { nickname: string | null }).nickname,
    ]),
  );
  const reportRowsWithNick = reports.map((r) => ({
    ...r,
    reporter_nickname: nicknameById.get(r.reporter_id) ?? null,
  }));

  const rows = (profiles ?? []).map((p) => ({
    id: p.id as string,
    nickname: p.nickname as string | null,
    avatar_seed: p.avatar_seed as string | null,
    avatar_path: p.avatar_path as string | null,
    role: asRole(p.role),
  }));

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-start bg-mural-creme">
      <div className="w-full max-w-2xl bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">⭐ Painel do Admin</h1>
          <Link
            href="/"
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ← Mural
          </Link>
        </header>

        <div className="p-6 space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase text-mural-dark/70 border-b border-mural-dark/20 pb-1">
              🚩 Denúncias abertas
              {reportRowsWithNick.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-900 px-2 py-0.5 rounded-full text-xs">
                  {reportRowsWithNick.length}
                </span>
              )}
            </h2>
            <ReportsQueue initialReports={reportRowsWithNick} />
          </section>

          {showAdminTools && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase text-mural-dark/70 border-b border-mural-dark/20 pb-1">
                ⭐ Papéis
              </h2>
              <div className="bg-mural-green/20 p-3 retro-border text-xs italic text-mural-dark">
                Promova moradores de confiança a moderadores (podem apagar
                qualquer recado e comentário). Admin só é definido por SQL.
              </div>
              <RoleManager profiles={rows} />
            </section>
          )}
        </div>

        <footer className="bg-mural-panel p-4 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo • Administração
          </p>
        </footer>
      </div>
    </main>
  );
}
