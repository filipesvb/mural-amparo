import Link from "next/link";

export const metadata = {
  title: "Links Úteis",
};

// Curadoria de links externos pra serviços/recursos da cidade. Estrutura
// minimalista pra facilitar adicionar mais conforme moradores sugerem.
// Cada link abre em aba nova — o Mural não embeda iframes pra não depender
// de X-Frame-Options de terceiros nem confundir a navegação.
const LINKS = [
  {
    title: "Linhas e Horários de Ônibus",
    description: "Horários, itinerários e linhas urbanas de Amparo (Sou Transportes).",
    href: "https://bus2.info/2you/#/1yqtg",
    icon: "🚌",
  },
];

export default function LinksUteisPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-start bg-mural-creme">
      <div className="w-full max-w-2xl bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="mural-title text-xl">🔗 Links Úteis</h1>
          <Link
            href="/"
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ← Mural
          </Link>
        </header>

        <div className="p-6 space-y-4">
          <p className="text-sm text-mural-dark/70 italic">
            Serviços e recursos úteis pros moradores de Amparo.
          </p>

          <div className="space-y-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mural-panel/50 p-4 retro-border hover:brightness-105 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{link.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-mural-ink text-sm flex items-center gap-1">
                      {link.title}
                      <span className="text-mural-ink/40 text-xs">↗</span>
                    </h2>
                    <p className="text-xs text-mural-dark/70 mt-0.5">
                      {link.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <p className="text-[11px] text-mural-dark/60 italic text-center pt-2 border-t border-mural-dark/10">
            Conhece outro serviço útil que deveria estar aqui? Escreva pra{" "}
            <a
              href="mailto:contato@mural-amparo.com.br"
              className="underline text-mural-brown font-bold"
            >
              contato@mural-amparo.com.br
            </a>
            .
          </p>
        </div>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo · Links Úteis
          </p>
        </footer>
      </div>
    </main>
  );
}
