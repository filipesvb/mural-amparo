import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";

export default async function EditarPerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const voltarHref = profile?.nickname
    ? `/perfil/${encodeURIComponent(profile.nickname)}`
    : "/";

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-start bg-mural-creme">
      <div className="w-full max-w-md bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">👤 Seu Perfil em Amparo</h1>
          <Link
            href={voltarHref}
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ← Voltar
          </Link>
        </header>

        <div className="p-6 space-y-6">
          <div className="bg-mural-green/20 p-3 retro-border text-xs italic text-mural-dark">
            Aqui você escolhe como os outros moradores te veem no Mural.
          </div>

          <ProfileForm profile={profile} />

          <div className="pt-4 border-t-2 border-mural-dark/20 text-center">
            <Link
              href="/configuracoes"
              className="text-xs underline text-mural-dark/70 hover:text-mural-dark"
            >
              ⚙️ Configurações da conta (senha, e-mail, privacidade)
            </Link>
          </div>
        </div>

        <footer className="bg-mural-panel p-4 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo • Edição de Morador
          </p>
        </footer>
      </div>
    </main>
  );
}
