import { createClient } from "@/utils/supabase/server";
import { updateProfile } from "@/app/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";

export default async function PerfilPage() {
  const supabase = await createClient();

  // 1. Verifica se o usuário está logado
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Busca os dados do perfil atual
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center bg-mural-creme">
      <div className="w-full max-w-md bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        {/* Header Retrô */}
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">👤 Seu Perfil em Amparo</h1>
          <Link
            href="/"
            className="text-xs bg-mural-dark px-2 py-1 border border-white retro-button-active hover:text-white"
          >
            [X] Sair
          </Link>
        </header>

        <div className="p-6 space-y-6">
          <div className="bg-mural-green/20 p-3 retro-border text-xs italic text-mural-dark">
            Aqui você escolhe como os outros moradores te veem no Mural.
          </div>

          {/* Chamamos um Client Component para o formulário ter interatividade (preview do avatar) */}
          <ProfileForm profile={profile} />
        </div>

        <footer className="bg-[#eee8de] p-4 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo • Edição de Morador
          </p>
        </footer>
      </div>
    </main>
  );
}
