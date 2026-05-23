"use client";

import { useState, useTransition } from "react";
import { reportContent } from "@/app/actions";
import {
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from "@/utils/types";

const REASONS: ReportReason[] = [
  "spam",
  "assedio",
  "discurso_odio",
  "conteudo_sexual",
  "violencia",
  "desinformacao",
  "outro",
];

export default function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: number;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError("");
    setInfo("");
    startTransition(async () => {
      const result = await reportContent(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.info) {
        setInfo(result.info);
        // Fecha o modal automático após sucesso (visto a confirmação inline rápido)
        setTimeout(onClose, 1600);
      }
    });
  }

  const targetLabel = targetType === "post" ? "este recado" : "este comentário";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Fecha ao clicar fora (no backdrop)
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white retro-border shadow-xl overflow-hidden">
        <header className="wood-header-footer p-3 border-b-2 border-mural-dark text-mural-creme flex justify-between items-center">
          <h2 className="font-bold tracking-tight">🚩 Denunciar {targetLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-xs bg-mural-ink/30 hover:bg-mural-ink/50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </header>

        <form action={handleSubmit} className="p-5 space-y-4">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />

          {error && (
            <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
              ⚠️ {error}
            </div>
          )}
          {info && (
            <div className="bg-green-100 border-2 border-green-800 p-3 text-green-800 text-sm retro-border font-bold">
              ✅ {info}
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase text-mural-dark mb-2">
              Motivo da denúncia
            </legend>
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 cursor-pointer hover:bg-mural-creme p-2 rounded-md transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="cursor-pointer"
                />
                <span className="text-sm">{REPORT_REASON_LABELS[r]}</span>
              </label>
            ))}
          </fieldset>

          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
              Detalhes <span className="text-mural-dark/50 normal-case">(opcional)</span>
            </label>
            <textarea
              name="details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm resize-none"
              placeholder="Algo que ajude a moderação a entender o contexto."
              rows={3}
              maxLength={500}
            />
            <p className="mt-1 text-[10px] text-mural-dark/60 text-right">
              {500 - details.length} caracteres restantes
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 bg-mural-creme text-mural-dark p-2 text-sm font-bold retro-border retro-button-active disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !!info}
              className="flex-1 bg-mural-brown text-white p-2 text-sm font-bold retro-border retro-button-active disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Enviar denúncia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
