import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/OnboardingFlow";

export const metadata = {
  title: "Bem-vindo ao Mural Amparo",
};

// Sanitiza o prefixo do e-mail pra um nickname válido (regex de nicknameSchema:
// [A-Za-z0-9_] de 2 a 30 chars). Caracteres inválidos viram "_"; vazio vira "morador".
function suggestNicknameFromEmail(email: string | undefined): string {
  if (!email) return "morador";
  const prefix = email.split("@")[0] ?? "";
  const cleaned = prefix.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 30);
  if (cleaned.length < 2) return "morador";
  return cleaned;
}

export default async function BemVindoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  // Quem já passou pelo fluxo (ou veio pela migração de bootstrap) vai direto
  // pra home — evita relogar e cair de novo aqui sem motivo.
  if (profile?.onboarded_at) redirect("/");

  const suggestedNickname = suggestNicknameFromEmail(user.email);

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-center bg-mural-creme">
      <div className="w-full max-w-md bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark text-mural-creme">
          <h1 className="mural-title text-xl">Bem-vindo ao Mural Amparo 🌳</h1>
          <p className="text-[11px] italic opacity-80 mt-1">
            Antes de entrar, escolha como vai aparecer pros outros moradores.
          </p>
        </header>

        <div className="p-6">
          <OnboardingFlow
            userId={user.id}
            suggestedNickname={suggestedNickname}
          />
        </div>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo • Boas-vindas
          </p>
        </footer>
      </div>
    </main>
  );
}
