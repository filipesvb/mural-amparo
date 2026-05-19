"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { suggestEvent } from "@/app/actions";
import HoneypotField from "./HoneypotField";

export default function SuggestEventForm({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="block soft-card p-4 text-center text-sm font-bold text-mural-ink hover:bg-mural-creme transition-colors"
      >
        Entre para sugerir um evento da cidade →
      </Link>
    );
  }

  if (done) {
    return (
      <div className="soft-card p-4 space-y-2 text-center">
        <p className="text-sm font-bold text-mural-ink">
          ✅ Sugestão enviada!
        </p>
        <p className="text-xs text-mural-ink/60">
          Ela aparece na agenda assim que a equipe aprovar.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setOpen(false);
          }}
          className="text-xs font-bold text-mural-brown underline"
        >
          Sugerir outro
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-mural-brown text-white px-4 py-3 text-sm font-bold rounded-lg retro-button-active"
      >
        + Sugerir um evento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setError("");
        setPending(true);
        try {
          const result = await suggestEvent(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
          setDone(true);
        } catch {
          setError("Algo deu errado. Tente novamente.");
        } finally {
          setPending(false);
        }
      }}
      className="soft-card p-4 space-y-3"
    >
      <HoneypotField />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-mural-ink">Sugerir evento</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-mural-ink/50 hover:text-mural-ink"
        >
          Cancelar
        </button>
      </div>

      <p className="text-xs text-mural-ink/60 italic">
        A sugestão passa por aprovação da equipe antes de entrar na agenda.
      </p>

      {error && (
        <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
          ⚠️ {error}
        </div>
      )}

      <input
        type="text"
        name="title"
        required
        maxLength={120}
        placeholder="Nome do evento (ex.: Feirão da Praça)"
        className="w-full px-3 py-2 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
      />

      <div className="flex gap-2">
        <label className="flex-1 text-xs font-bold text-mural-ink/70 space-y-1">
          Data
          <input
            type="date"
            name="date"
            required
            className="w-full px-3 py-2 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
          />
        </label>
        <label className="flex-1 text-xs font-bold text-mural-ink/70 space-y-1">
          Horário
          <input
            type="time"
            name="time"
            required
            className="w-full px-3 py-2 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
          />
        </label>
      </div>

      <input
        type="text"
        name="location"
        required
        maxLength={120}
        placeholder="Local (ex.: Praça Pádua Sales)"
        className="w-full px-3 py-2 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
      />

      <textarea
        name="description"
        rows={3}
        maxLength={500}
        placeholder="Detalhes (opcional): o que é, quem organiza, se é gratuito..."
        className="w-full px-3 py-2 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30 resize-none"
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-mural-brown text-white px-4 py-2.5 text-sm font-bold rounded-lg retro-button-active disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar para aprovação"}
      </button>
    </form>
  );
}
