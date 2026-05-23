"use client";

import { useEffect } from "react";
import Link from "next/link";

// Boundary de erro de rota — captura qualquer throw num Server/Client
// Component dentro deste app. O console.error vai pros logs da função
// na Vercel (visíveis em Project → Logs). `reset()` re-renderiza o
// boundary sem perder a sessão.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro de rota:", error);
  }, [error]);

  return (
    <main className="min-h-screen p-4 md:p-8 flex justify-center items-center bg-mural-creme">
      <div className="w-full max-w-md bg-white retro-border shadow-lg overflow-hidden flex flex-col">
        <header className="wood-header-footer p-4 border-b-2 border-mural-dark text-mural-creme">
          <h1 className="mural-title text-xl">Ops, algo deu errado</h1>
        </header>

        <div className="p-6 space-y-4">
          <p className="text-sm text-mural-dark">
            Encontramos um problema ao mostrar esta página. Já registramos o
            erro do nosso lado — você pode tentar de novo:
          </p>

          {error.digest && (
            <p className="text-[11px] text-mural-dark/60 font-mono break-all">
              Código do erro: {error.digest}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 bg-mural-brown text-white p-2 text-sm font-bold retro-border retro-button-active"
            >
              Tentar de novo
            </button>
            <Link
              href="/"
              className="flex-1 bg-mural-creme text-mural-dark p-2 text-sm font-bold text-center retro-border retro-button-active"
            >
              Ir pro Mural
            </Link>
          </div>
        </div>

        <footer className="bg-mural-panel p-3 border-t-2 border-mural-dark text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase">
            Mural Amparo
          </p>
        </footer>
      </div>
    </main>
  );
}
