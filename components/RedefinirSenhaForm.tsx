"use client";

import { useState } from "react";
import { updatePassword } from "@/app/actions";

export default function RedefinirSenhaForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    setErrorMessage("");
    const result = await updatePassword(formData);
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
    // Se deu certo a action faz redirect; não precisamos resetar o loading.
  }

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center">
      <div className="w-full max-w-md bg-mural-creme retro-border shadow-lg">
        <header className="wood-header-footer p-3 border-b-2 text-mural-creme">
          <h1 className="font-bold tracking-tight">Redefinir senha</h1>
        </header>

        <div className="p-6">
          <form action={handleAction} className="space-y-4">
            <div className="bg-mural-panel p-3 retro-border text-xs italic text-mural-dark">
              Escolha uma nova senha para sua conta no Mural.
            </div>

            {errorMessage && (
              <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
                ⚠️ {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-1 italic">
                Nova senha (mín. 6 dígitos):
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoFocus
                className="w-full p-2 bg-white border-2 border-mural-dark focus:outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-mural-brown text-white p-3 font-bold retro-border retro-button-active disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar nova senha 💾"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
