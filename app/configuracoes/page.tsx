import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { signOutEverywhere } from "@/app/actions";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import ChangeEmailForm from "@/components/ChangeEmailForm";

export const metadata = {
  title: "Configurações",
};

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = user.email ?? "";

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-start bg-mural-creme">
      <div className="w-full max-w-2xl bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">⚙️ Configurações</h1>
          <Link
            href="/"
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ← Mural
          </Link>
        </header>

        <div className="p-6 space-y-8">
          {/* CONTA */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase text-mural-dark/70 border-b border-mural-dark/20 pb-1">
              Conta
            </h2>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-3">
              <h3 className="text-xs font-bold uppercase text-mural-dark">
                🔑 Trocar senha
              </h3>
              <ChangePasswordForm />
            </div>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-3">
              <h3 className="text-xs font-bold uppercase text-mural-dark">
                ✉️ Trocar e-mail
              </h3>
              <ChangeEmailForm currentEmail={email} />
            </div>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-2">
              <h3 className="text-xs font-bold uppercase text-mural-dark">
                👤 Perfil público
              </h3>
              <p className="text-xs text-mural-dark/70">
                Apelido, foto, bio e avatar gerado.
              </p>
              <Link
                href="/perfil/editar"
                className="inline-block bg-mural-creme text-mural-dark px-3 py-1.5 text-xs font-bold retro-border retro-button-active"
              >
                Editar perfil →
              </Link>
            </div>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-2">
              <h3 className="text-xs font-bold uppercase text-mural-dark">
                🚪 Sessões
              </h3>
              <p className="text-xs text-mural-dark/70">
                Desconecta você de todos os dispositivos onde sua conta está
                logada — incluindo este. Útil se desconfia de acesso indevido.
              </p>
              <form action={signOutEverywhere}>
                <button
                  type="submit"
                  className="bg-mural-creme text-mural-dark px-3 py-1.5 text-xs font-bold retro-border retro-button-active"
                >
                  Sair de todos os dispositivos
                </button>
              </form>
            </div>
          </section>

          {/* NOTIFICAÇÕES */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase text-mural-dark/70 border-b border-mural-dark/20 pb-1">
              Notificações
            </h2>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-2">
              <h3 className="text-xs font-bold uppercase text-mural-dark">
                🔔 Push notifications
              </h3>
              <p className="text-xs text-mural-dark/70">
                Pra ativar ou desativar notificações por push (curtidas,
                comentários, menções), clique no <strong>sino 🔔</strong> no topo
                e use o botão &quot;Ativar/Desativar notificações&quot;.
              </p>
              <p className="text-[11px] italic text-mural-dark/50">
                Em breve: escolher quais tipos de notificação receber.
              </p>
            </div>
          </section>

          {/* PRIVACIDADE & DADOS */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase text-mural-dark/70 border-b border-mural-dark/20 pb-1">
              Privacidade & dados
            </h2>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-3">
              <h3 className="text-xs font-bold uppercase text-mural-dark">
                📥 Exportar meus dados
              </h3>
              <p className="text-xs text-mural-dark/70">
                Baixe um arquivo JSON com tudo que o Mural guarda sobre você:
                perfil, posts, comentários, reações, bookmarks e seguidores.
                Direito LGPD de portabilidade.
              </p>
              <a
                href="/api/exportar-dados"
                className="inline-block bg-mural-creme text-mural-dark px-3 py-1.5 text-xs font-bold retro-border retro-button-active"
                download
              >
                Baixar JSON
              </a>
            </div>

            <div className="bg-mural-panel/50 p-4 retro-border space-y-3 border-red-300">
              <h3 className="text-xs font-bold uppercase text-red-900">
                🗑️ Excluir minha conta
              </h3>
              <p className="text-xs text-mural-dark/70">
                Apaga sua conta e todo o conteúdo associado (posts, imagens,
                comentários, reações, bookmarks, follows). Não dá pra desfazer.
              </p>
              <Link
                href="/perfil/excluir"
                className="inline-block bg-red-50 text-red-900 px-3 py-1.5 text-xs font-bold border-2 border-red-800 retro-button-active hover:bg-red-100"
              >
                Excluir conta →
              </Link>
            </div>

            <p className="text-[11px] text-mural-dark/60 italic text-center pt-2">
              Veja a{" "}
              <Link href="/privacidade" className="underline font-bold">
                Política de Privacidade
              </Link>{" "}
              e os{" "}
              <Link href="/termos" className="underline font-bold">
                Termos de Uso
              </Link>
              .
            </p>
          </section>
        </div>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo · Configurações
          </p>
        </footer>
      </div>
    </main>
  );
}
