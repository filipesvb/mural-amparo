import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export const metadata = {
  title: "Excluir conta · Mural Amparo",
};

export default async function ExcluirContaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-center bg-mural-creme">
      <div className="w-full max-w-md bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">🗑️ Excluir minha conta</h1>
          <Link
            href="/perfil/editar"
            className="text-xs bg-mural-dark px-2 py-1 border border-white retro-button-active hover:text-white"
          >
            [←] Voltar
          </Link>
        </header>

        <div className="p-6">
          <DeleteAccountForm />
        </div>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo · Exclusão de conta
          </p>
        </footer>
      </div>
    </main>
  );
}
