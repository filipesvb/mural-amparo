"use client";

import { useState, useTransition } from "react";
import { changeMyPassword } from "@/app/actions";

export default function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();

  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }

  function handleCancel() {
    resetForm();
    setIsOpen(false);
  }

  function handleSubmit(formData: FormData) {
    setError("");
    setInfo("");
    if (mismatch) {
      setError("A confirmação não bate com a nova senha.");
      return;
    }
    startTransition(async () => {
      const result = await changeMyPassword(formData);
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
            ✅ {info}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-mural-dark/80 font-mono tracking-widest">
            ••••••••
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
      {error && (
        <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Senha atual
        </label>
        <input
          name="current_password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          required
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Nova senha
        </label>
        <input
          name="new_password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="mt-1 text-[10px] text-mural-dark/60">Mínimo 6 caracteres.</p>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Confirmar nova senha
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full p-2 bg-mural-creme border-2 focus:outline-none text-sm ${
            mismatch ? "border-red-800" : "border-mural-dark"
          }`}
          required
          minLength={6}
          autoComplete="new-password"
        />
        {mismatch && (
          <p className="mt-1 text-[10px] text-red-800 font-bold">
            ⚠️ As senhas não conferem.
          </p>
        )}
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
          disabled={isPending || mismatch}
          className="flex-1 bg-mural-brown text-white p-2 text-sm font-bold retro-border retro-button-active disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Trocando..." : "Trocar senha"}
        </button>
      </div>
    </form>
  );
}
