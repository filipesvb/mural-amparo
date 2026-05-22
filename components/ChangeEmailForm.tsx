"use client";

import { useState, useTransition } from "react";
import { changeMyEmail } from "@/app/actions";

export default function ChangeEmailForm({
  currentEmail,
}: {
  currentEmail: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setNewEmail("");
    setPassword("");
    setError("");
  }

  function handleCancel() {
    resetForm();
    setIsOpen(false);
  }

  function handleSubmit(formData: FormData) {
    setError("");
    setInfo("");
    startTransition(async () => {
      const result = await changeMyEmail(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.info) {
        setInfo(result.info);
        resetForm();
        setIsOpen(false);
      }
    });
  }

  if (!isOpen) {
    return (
      <div className="space-y-2">
        {info && (
          <div className="bg-green-100 border-2 border-green-800 p-2 text-green-800 text-xs retro-border font-bold">
            ✉️ {info}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-mural-dark/80 truncate">
            {currentEmail}
          </span>
          <button
            type="button"
            onClick={() => {
              setInfo("");
              setIsOpen(true);
            }}
            className="bg-mural-creme text-mural-dark px-3 py-1 text-xs font-bold retro-border retro-button-active shrink-0"
          >
            Alterar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-xs text-mural-dark/70 italic">
        Atual: <strong className="not-italic">{currentEmail}</strong>
      </p>

      {error && (
        <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Novo e-mail
        </label>
        <input
          name="new_email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Sua senha (pra confirmar)
        </label>
        <input
          name="current_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="flex-1 bg-mural-creme text-mural-dark p-2 text-sm font-bold retro-border retro-button-active disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-mural-brown text-white p-2 text-sm font-bold retro-border retro-button-active disabled:opacity-50"
        >
          {isPending ? "Enviando..." : "Enviar link"}
        </button>
      </div>
    </form>
  );
}
