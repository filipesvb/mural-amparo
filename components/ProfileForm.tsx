"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions";

export default function ProfileForm({ profile }: { profile: any }) {
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [seed, setSeed] = useState(profile?.avatar_seed || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Preview Dinâmico do Avatar */}
      <div className="flex flex-col items-center justify-center p-4 bg-white retro-border border-dashed">
        <div className="w-24 h-24 bg-mural-brown retro-border overflow-hidden mb-2">
          <img
            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`}
            alt="Preview do Avatar"
            className="w-full h-full"
          />
        </div>
        <p className="text-[10px] font-bold text-mural-brown uppercase">
          Identidade Visual
        </p>
      </div>

      {error && (
        <div className="p-2 bg-red-100 border-2 border-red-800 text-red-800 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Apelido (Nickname):
        </label>
        <input
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm font-bold"
          placeholder="Ex: ZeDaPadaria"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Semente do Avatar (Mude o texto!):
        </label>
        <input
          name="avatar_seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          placeholder="Digite qualquer coisa..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-mural-brown text-white p-3 font-bold retro-border retro-button-active disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Atualizar Identidade 💾"}
      </button>
    </form>
  );
}
