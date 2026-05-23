"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReport } from "@/app/actions";
import { REPORT_REASON_LABELS, type Report } from "@/utils/types";

interface ReportRow extends Report {
  reporter_nickname: string | null;
}

export default function ReportsQueue({
  initialReports,
}: {
  initialReports: ReportRow[];
}) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  if (reports.length === 0) {
    return (
      <p className="text-xs italic text-mural-dark/60 text-center py-3">
        Nenhuma denúncia aberta. 🎉
      </p>
    );
  }

  function handle(reportId: number, decision: "hide" | "dismiss") {
    const msg =
      decision === "hide"
        ? "Apagar o conteúdo denunciado e marcar denúncia como revisada?"
        : "Marcar como falso positivo (sem apagar nada)?";
    if (!confirm(msg)) return;

    setError("");
    setBusyId(reportId);
    startTransition(async () => {
      const result = await resolveReport(reportId, decision);
      setBusyId(null);
      if (result?.error) {
        setError(result.error);
      } else {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
          ⚠️ {error}
        </div>
      )}

      {reports.map((r) => {
        const targetLink =
          r.target_type === "post"
            ? `/#recado-${r.target_id}`
            : null; // comentário precisaria do post id pra linkar
        return (
          <div
            key={r.id}
            className="bg-mural-panel/50 p-3 retro-border space-y-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-mural-dark/60">
                  Denúncia <span className="font-mono">#{r.id}</span> ·{" "}
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </div>
                <div className="text-sm font-bold text-mural-dark">
                  {REPORT_REASON_LABELS[r.reason]}
                </div>
                <div className="text-xs text-mural-dark/70">
                  Denunciante:{" "}
                  <span className="font-bold">
                    {r.reporter_nickname ?? "(sem apelido)"}
                  </span>
                </div>
                <div className="text-xs text-mural-dark/70">
                  Alvo: {r.target_type === "post" ? "recado" : "comentário"} #
                  {r.target_id}
                  {targetLink && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={targetLink}
                        target="_blank"
                        rel="noopener"
                        className="underline text-mural-brown font-bold"
                      >
                        ver no feed ↗
                      </a>
                    </>
                  )}
                </div>
                {r.details && (
                  <div className="text-xs text-mural-dark/80 mt-1 italic">
                    &ldquo;{r.details}&rdquo;
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handle(r.id, "hide")}
                disabled={busyId === r.id}
                className="flex-1 bg-red-50 text-red-900 border-2 border-red-800 px-2 py-1 text-xs font-bold rounded-md cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                🗑️ Ocultar conteúdo
              </button>
              <button
                type="button"
                onClick={() => handle(r.id, "dismiss")}
                disabled={busyId === r.id}
                className="flex-1 bg-mural-creme text-mural-dark border-2 border-mural-dark/40 px-2 py-1 text-xs font-bold rounded-md cursor-pointer hover:brightness-105 transition-all disabled:opacity-50"
              >
                ✓ Falso positivo
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
