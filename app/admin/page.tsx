import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RoleManager from "@/components/RoleManager";
import { asRole, isAdmin } from "@/utils/roles";

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

  // Proteção página a página: só admin entra (mesma convenção do projeto).
  if (!isAdmin(asRole(me?.role))) redirect("/");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_seed, avatar_path, role")
    .order("role", { ascending: true })
    .order("nickname", { ascending: true })
    .limit(500);

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
            className="text-xs bg-mural-dark px-2 py-1 border border-white retro-button-active hover:text-white"
          >
            [←] Voltar
          </Link>
        </header>

        <div className="p-6 space-y-4">
          <div className="bg-mural-green/20 p-3 retro-border text-xs italic text-mural-dark">
            Promova moradores de confiança a moderadores (podem apagar
            qualquer recado e comentário). Admin só é definido por SQL.
          </div>

          <RoleManager profiles={rows} />
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
