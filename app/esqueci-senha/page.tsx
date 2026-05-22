"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";

export default function EsqueciSenhaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    const result = await requestPasswordReset(formData);
    if (result?.error) setErrorMessage(result.error);
    if (result?.info) setInfoMessage(result.info);
    setIsLoading(false);
  }

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center">
      <div className="w-full max-w-md bg-mural-creme retro-border shadow-lg">
        <header className="wood-header-footer p-3 border-b-2 flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">Esqueci minha senha</h1>
          <Link
            href="/login"
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            ← Login
          </Link>
        </header>

        <div className="p-6">
          <form action={handleAction} className="space-y-4">
            <div className="bg-mural-panel p-3 retro-border text-xs italic text-mural-dark">
              Informe seu e-mail e enviaremos um link para você redefinir a
              senha.
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-mural-brown text-white p-3 font-bold retro-border retro-button-active disabled:opacity-50"
            >
              {isLoading ? "Enviando..." : "Enviar link ✉️"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
