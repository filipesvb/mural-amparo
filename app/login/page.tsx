"use client";

import { useState } from "react";
import { authenticate } from "@/app/actions";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    setErrorMessage("");
    const result = await authenticate(formData);
    if (result?.error) setErrorMessage(result.error);
    setIsLoading(false);
  }

  return (
    <main className="h-screen p-4 md:p-8 flex justify-center items-center">
      <div className="w-full max-w-md bg-mural-creme retro-border shadow-lg">
        <header className="wood-header-footer p-3 border-b-2 flex justify-between items-center text-mural-creme">
          <h1 className="font-bold tracking-tight">Acesso ao Mural</h1>
          <Link
            href="/"
            className="text-xs retro-button-active bg-mural-dark px-2 border border-white"
          >
            [X] Fechar
          </Link>
        </header>

        <div className="p-6">
          <form action={handleAction} className="space-y-4">
            <div className="bg-[#eee8de] p-3 retro-border text-xs mb-4 italic text-mural-dark">
              Dica: Se você não tiver conta, ela será criada automaticamente ao
              "Entrar".
            </div>

            {errorMessage && (
              <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
                ⚠️ {errorMessage}
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
          </form>
        </div>
      </div>
    </main>
  );
}
