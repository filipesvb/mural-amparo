"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "@/app/actions";
import Link from "next/link";

// useSearchParams() exige um boundary de Suspense no prerender (CSR bailout).
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const INFO_MESSAGES: Record<string, string> = {
  "conta-excluida":
    "Sua conta e todos os dados associados foram excluídos. Esperamos te ver de novo em Amparo.",
  "desconectado-tudo":
    "Você foi desconectado de todos os dispositivos. Faça login novamente pra continuar.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("error") ?? "",
  );
  const [infoMessage, setInfoMessage] = useState(
    INFO_MESSAGES[searchParams.get("info") ?? ""] ?? "",
  );

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    const result = await authenticate(formData);
    if (result?.error) setErrorMessage(result.error);
    if (result?.info) setInfoMessage(result.info);
    setIsLoading(false);
  }

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center">
      <div className="w-full max-w-md bg-mural-creme retro-border shadow-lg">
        <header className="wood-header-footer p-3 border-b-2 flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">Acesso ao Mural</h1>
          <Link
            href="/"
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ✕ Fechar
          </Link>
        </header>

        <div className="p-6">
          <form action={handleAction} className="space-y-4">
            <div className="bg-mural-panel p-3 retro-border text-xs mb-4 italic text-mural-dark">
              Dica: Se você não tiver conta, criaremos uma e enviaremos um link
              de confirmação por e-mail.
            </div>

            {errorMessage && (
              <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
                ⚠️ {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div className="bg-green-100 border-2 border-green-800 p-3 text-green-800 text-sm retro-border font-bold">
                ✉️ {infoMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-1 italic">
                E-mail:
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full p-2 bg-white border-2 border-mural-dark focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 italic">
                Senha (mín. 6 dígitos):
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full p-2 bg-white border-2 border-mural-dark focus:outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-mural-brown text-white p-3 font-bold retro-border retro-button-active disabled:opacity-50"
            >
              {isLoading ? "Autenticando..." : "Entrar no Mural 🔑"}
            </button>

            <p className="text-center text-xs">
              <Link
                href="/esqueci-senha"
                className="underline italic text-mural-dark opacity-70 hover:opacity-100"
              >
                Esqueci minha senha
              </Link>
            </p>

            <p className="text-center text-[11px] italic text-mural-dark/60 pt-2 border-t border-mural-dark/10">
              Ao se cadastrar, você concorda com os{" "}
              <Link
                href="/termos"
                className="underline text-mural-brown font-bold"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                className="underline text-mural-brown font-bold"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
