"use client";

import { useEffect } from "react";

// Boundary de último recurso — captura erros que escaparam até do
// app/error.tsx (geralmente: throw no layout raiz). Renderiza fallback
// completo (incluindo <html>/<body>) porque substitui a árvore inteira.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Erro global (root layout):", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: "Tahoma, Verdana, sans-serif",
          background: "#f4ede4",
          color: "#2d2d2d",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #e2d4ba",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "440px",
            width: "100%",
            boxShadow: "0 1px 3px rgba(74, 53, 37, 0.08)",
          }}
        >
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 800,
              fontSize: "24px",
              margin: "0 0 12px 0",
              color: "#4a3525",
            }}
          >
            Ops, algo deu errado
          </h1>
          <p style={{ fontSize: "14px", margin: "0 0 16px 0" }}>
            O Mural encontrou um problema sério. Tente recarregar a página em
            alguns instantes. Se persistir, escreva pra{" "}
            <a
              href="mailto:contato@mural-amparo.com.br"
              style={{ color: "#9b6a3f", fontWeight: 700 }}
            >
              contato@mural-amparo.com.br
            </a>
            .
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
                color: "rgba(74, 53, 37, 0.6)",
                wordBreak: "break-all",
              }}
            >
              Código do erro: {error.digest}
            </p>
          )}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "16px",
              background: "#9b6a3f",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Recarregar Mural
          </a>
        </div>
      </body>
    </html>
  );
}
