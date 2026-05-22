import Link from "next/link";

export const metadata = {
  title: "Termos de Uso · Mural Amparo",
};

const UPDATED_AT = "22 de maio de 2026";

export default function TermosPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center bg-mural-creme">
      <div className="w-full max-w-2xl bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="mural-title text-xl">Termos de Uso</h1>
          <Link
            href="/"
            className="text-xs bg-mural-dark px-2 py-1 border border-white retro-button-active hover:text-white"
          >
            [←] Voltar
          </Link>
        </header>

        <article className="p-6 space-y-5 text-sm leading-relaxed text-mural-dark">
          <p className="text-xs italic text-mural-dark/60">
            Última atualização: {UPDATED_AT}
          </p>

          <p>
            Bem-vindo ao <strong>Mural Amparo</strong>, um feed comunitário pra
            moradores de Amparo-SP. Ao criar uma conta e usar o app, você
            concorda com estes termos. Se não concorda, por favor não use o
            serviço.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">1. Quem pode usar</h2>
            <p>
              Pra criar conta você deve ter pelo menos 13 anos. Menores de 18
              anos devem ter autorização dos responsáveis. O Mural é gratuito e
              aberto a qualquer pessoa interessada na comunidade de Amparo.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">2. Conduta esperada</h2>
            <p>
              O Mural é um espaço comunitário. Ao postar, você concorda em:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Ser respeitoso com outros moradores.</li>
              <li>
                Não publicar discurso de ódio, ofensas pessoais, ameaças,
                assédio, conteúdo discriminatório (raça, gênero, orientação
                sexual, religião, etc.).
              </li>
              <li>
                Não publicar conteúdo sexual explícito, violência gráfica ou
                conteúdo envolvendo menores de forma inadequada.
              </li>
              <li>
                Não publicar spam, correntes, propaganda enganosa ou phishing.
              </li>
              <li>
                Não publicar conteúdo ilegal (drogas, armas, jogos de azar,
                etc.) nem incitar atividades criminosas.
              </li>
              <li>
                Não se passar por outra pessoa, instituição ou autoridade.
              </li>
              <li>
                Respeitar direitos autorais — só publique imagens e textos que
                são seus ou que você tem permissão de compartilhar.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">3. Seu conteúdo</h2>
            <p>
              O que você publica continua sendo seu. Ao publicar no Mural, você
              concede ao Mural Amparo uma licença não-exclusiva, gratuita e
              limitada pra exibir esse conteúdo dentro do próprio app
              (incluindo previews em notificações). Essa licença termina quando
              você apaga o conteúdo ou exclui sua conta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">4. Moderação</h2>
            <p>
              Moderadores e administradores podem ocultar ou remover conteúdo
              que viole estes termos, sem aviso prévio. Em casos graves ou
              reincidentes, sua conta pode ser suspensa ou excluída.
            </p>
            <p>
              Se você acredita que algum conteúdo viola os termos, use o botão
              de denúncia no próprio post ou entre em contato com a
              administração.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">5. Sua conta</h2>
            <p>
              Você é responsável por manter a confidencialidade da sua senha e
              por toda atividade na sua conta. Notifique a administração se
              suspeitar de acesso indevido. Você pode excluir sua conta a
              qualquer momento em{" "}
              <Link
                href="/perfil/editar"
                className="underline text-mural-brown font-bold"
              >
                Editar perfil
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">6. Disponibilidade</h2>
            <p>
              O Mural é fornecido &quot;como está&quot;, em regime de melhor
              esforço. Podem ocorrer interrupções, perda eventual de dados ou
              mudanças no serviço. Não nos responsabilizamos por danos
              indiretos decorrentes do uso ou indisponibilidade do app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">7. Mudanças nos termos</h2>
            <p>
              Estes termos podem ser atualizados de tempos em tempos. Mudanças
              relevantes serão comunicadas no Mural. O uso contínuo após uma
              mudança significa que você aceitou a nova versão.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">8. Lei aplicável</h2>
            <p>
              Estes termos são regidos pelas leis brasileiras. Foro de Amparo,
              SP, fica eleito pra dirimir eventuais conflitos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">9. Contato</h2>
            <p>
              Dúvidas sobre os termos:{" "}
              <a
                href="mailto:contato@mural-amparo.com.br"
                className="underline text-mural-brown font-bold"
              >
                contato@mural-amparo.com.br
              </a>
              .
            </p>
          </section>

          <p className="text-xs italic text-mural-dark/60 pt-4 border-t border-mural-dark/20">
            Veja também a{" "}
            <Link
              href="/privacidade"
              className="underline text-mural-brown font-bold not-italic"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </article>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo · Termos
          </p>
        </footer>
      </div>
    </main>
  );
}
