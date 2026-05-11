"use client";

import { useState } from "react";
import { createPost } from "@/app/actions";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/utils/types";

export default function CreatePostWidget({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  // Se o morador não estiver logado, o botão leva para o login
  if (!user) {
    return (
      <a
        href="/login"
        className="w-full bg-mural-creme text-mural-dark p-4 retro-border font-bold flex items-center justify-between gap-2 retro-button-active mb-6 hover:bg-white transition-colors"
      >
        <span className="text-gray-500 font-normal italic">
          Entre para postar um recado em Amparo...
        </span>
        <div className="bg-mural-dark text-white px-4 py-1 retro-border text-sm">
          🔑 Entrar
        </div>
      </a>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-mural-creme text-mural-dark p-4 retro-border font-bold flex items-center justify-between gap-2 retro-button-active mb-6 hover:bg-white transition-colors"
      >
        <span className="text-gray-500 font-normal italic">
          O que está acontecendo, {user.email?.split("@")[0]}?
        </span>
        <div className="bg-mural-brown text-white px-4 py-1 retro-border text-sm">
          ➕ Escrever
        </div>
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError("");
        const result = await createPost(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setIsOpen(false);
      }}
      className="bg-white p-4 retro-border mb-6 relative shadow-md"
    >
      <div className="flex justify-between items-center border-b-2 border-mural-brown mb-3 pb-2">
        <h3 className="font-bold text-mural-brown italic">
          Novo Recado de: {profile?.nickname || user.email?.split("@")[0]}
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-red-700 font-bold hover:underline text-sm"
        >
          [X] Fechar
        </button>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="bg-red-100 border-2 border-red-800 p-2 text-red-800 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}
        <input
          type="hidden"
          name="author_name"
          value={profile?.nickname || user.email?.split("@")[0]}
        />

        <textarea
          name="content"
          placeholder="Digite seu recado aqui..."
          required
          rows={3}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm resize-none"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-mural-brown text-white px-6 py-2 font-bold retro-border retro-button-active flex-1"
          >
            Publicar no Mural 📢
          </button>
        </div>
      </div>
    </form>
  );
}
