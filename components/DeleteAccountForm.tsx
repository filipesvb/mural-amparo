"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteAccount } from "@/app/actions";

const CONFIRM_WORD = "EXCLUIR";

export default function DeleteAccountForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isReady = password.length >= 6 && confirmation === CONFIRM_WORD;

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await deleteAccount(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="bg-red-50 border-2 border-red-800 p-3 retro-border text-sm text-red-900">
        <p className="font-bold mb-2">⚠️ Esta ação é definitiva.</p>
        <p>Ao excluir sua conta, vão sumir pra sempre:</p>
        <ul className="list-disc ml-5 mt-2 space-y-0.5 text-xs">
          <li>Seu perfil (apelido, foto, bio)</li>
          <li>Todos os seus recados e imagens publicadas</li>
          <li>Comentários, reações e bookmarks</li>
          <li>Inscrições de notificação push</li>
          <li>Conexões de seguir/seguidores</li>
        </ul>
        <p className="mt-2 text-xs italic">
          Não dá pra desfazer. Se quiser ficar com cópia, exporte seus dados
          antes de continuar.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Sua senha
        </label>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          placeholder="Digite a senha que você usa pra entrar"
          required
          minLength={6}
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Confirmação — digite{" "}
          <span className="font-mono bg-red-100 px-1">{CONFIRM_WORD}</span> em
          maiúsculas
        </label>
        <input
          name="confirmation"
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm font-mono"
          placeholder={CONFIRM_WORD}
          required
          autoComplete="off"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/configuracoes"
          className="flex-1 bg-mural-creme text-mural-dark p-3 font-bold text-center retro-border retro-button-active"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending || !isReady}
          className="flex-1 bg-red-800 text-white p-3 font-bold retro-border retro-button-active disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Excluindo..." : "Excluir minha conta"}
        </button>
      </div>
    </form>
  );
}
