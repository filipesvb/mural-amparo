import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade · Mural Amparo",
};

const UPDATED_AT = "22 de maio de 2026";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center bg-mural-creme">
      <div className="w-full max-w-2xl bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark flex justify-between items-center text-mural-creme">
          <h1 className="mural-title text-xl">Política de Privacidade</h1>
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
            O <strong>Mural Amparo</strong> é um feed comunitário pra moradores
            de Amparo-SP. Esta política explica o que coletamos, por quê, e os
            seus direitos sob a Lei Geral de Proteção de Dados (LGPD, Lei
            13.709/2018).
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">
              1. Dados coletados
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>E-mail e senha</strong> — pra autenticar você no app. A
                senha nunca é guardada em texto puro, apenas como hash.
              </li>
              <li>
                <strong>Apelido, foto de perfil, bio e avatar gerado</strong> —
                informações que você escolhe pra se identificar publicamente no
                mural.
              </li>
              <li>
                <strong>Conteúdo que você publica</strong> — recados, imagens,
                comentários, reações e bookmarks.
              </li>
              <li>
                <strong>Relações sociais</strong> — quem você segue, quem te
                segue, menções e notificações.
              </li>
              <li>
                <strong>Inscrição de notificação push</strong> — endpoint do
                navegador que permite enviar alertas. Você pode desativar a
                qualquer momento no sino de notificações.
              </li>
              <li>
                <strong>Datas de criação e atualização</strong> — usadas pra
                ordenar o feed e exibir &quot;morador desde&quot;.
              </li>
            </ul>
            <p>
              Não coletamos CPF, endereço, telefone, geolocalização precisa ou
              dados sensíveis (saúde, religião, política, etc.).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">2. Finalidade</h2>
            <p>
              Os dados acima são usados exclusivamente pra operar o Mural:
              autenticar o login, exibir o conteúdo público que você publica,
              entregar notificações que você optou por receber e moderar o
              espaço (em caso de denúncia ou violação dos Termos).
            </p>
            <p>
              <strong>Não vendemos seus dados</strong> nem usamos pra
              publicidade direcionada. Não há rastreamento entre sites.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">
              3. Quem processa seus dados
            </h2>
            <p>O Mural se apoia em alguns serviços terceiros pra funcionar:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Supabase</strong> — banco de dados (PostgreSQL),
                autenticação e armazenamento de imagens.
              </li>
              <li>
                <strong>Vercel</strong> — hospedagem da aplicação web.
              </li>
              <li>
                <strong>Resend</strong> — envio dos e-mails de confirmação de
                cadastro e redefinição de senha.
              </li>
              <li>
                <strong>DiceBear</strong> — geração do avatar pixel-art quando
                você não envia uma foto (recebe apenas a sua
                &quot;semente&quot;, não o seu e-mail).
              </li>
              <li>
                <strong>Open-Meteo</strong> — previsão do tempo de Amparo
                (consultada pelo servidor, não recebe dados seus).
              </li>
            </ul>
            <p>
              Esses serviços operam sob seus próprios termos e políticas de
              privacidade. Recomendamos consultá-los.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">
              4. Seus direitos (LGPD)
            </h2>
            <p>Você tem direito de, a qualquer momento:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Acessar e exportar</strong> seus dados — disponível em{" "}
                <Link
                  href="/perfil/editar"
                  className="underline text-mural-brown font-bold"
                >
                  Editar perfil
                </Link>{" "}
                → &quot;Exportar meus dados&quot;.
              </li>
              <li>
                <strong>Corrigir</strong> apelido, bio, foto e demais campos do
                seu perfil — também em &quot;Editar perfil&quot;.
              </li>
              <li>
                <strong>Excluir sua conta</strong> e todos os dados associados —
                em &quot;Editar perfil&quot; → &quot;Excluir minha conta&quot;.
                Posts e comentários que você criou são apagados junto.
              </li>
              <li>
                <strong>Revogar consentimento</strong> de notificações push pelo
                sino, a qualquer momento.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">5. Retenção</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Ao
              excluir a conta, todos os dados pessoais e o conteúdo que você
              publicou (posts, imagens, comentários, reações, bookmarks,
              inscrições de notificação) são apagados imediatamente. Cópias de
              backup podem persistir por até 30 dias no provedor de banco
              (Supabase).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">6. Contato</h2>
            <p>
              Dúvidas sobre privacidade ou exercício de direitos LGPD: escreva
              pra{" "}
              <a
                href="mailto:contato@mural-amparo.com.br"
                className="underline text-mural-brown font-bold"
              >
                contato@mural-amparo.com.br
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold uppercase">7. Mudanças</h2>
            <p>
              Esta política pode ser atualizada de tempos em tempos. Mudanças
              relevantes serão comunicadas no próprio Mural antes de entrarem em
              vigor.
            </p>
          </section>
        </article>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo · Privacidade
          </p>
        </footer>
      </div>
    </main>
  );
}
