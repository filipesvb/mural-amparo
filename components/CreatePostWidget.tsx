"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createPost } from "@/app/actions";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/utils/types";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
} from "@/utils/storage";
import { POST_CATEGORIES, DEFAULT_CATEGORY } from "@/utils/categories";
import MentionInput from "./MentionInput";

export default function CreatePostWidget({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) {
      clearImage();
      return;
    }
    if (
      !(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)
    ) {
      setError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      clearImage();
      return;
    }
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setError("Imagem muito grande. O limite é 5 MB.");
      clearImage();
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function reset() {
    clearImage();
    setError("");
    setIsOpen(false);
  }

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
          O que está acontecendo, {profile?.nickname}?
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
        reset();
      }}
      className="bg-white p-4 retro-border mb-6 relative shadow-md"
    >
      <div className="flex justify-between items-center border-b-2 border-mural-brown mb-3 pb-2">
        <h3 className="font-bold text-mural-brown italic">
          Novo Recado de: {profile?.nickname || user.email?.split("@")[0]}
        </h3>
        <button
          type="button"
          onClick={reset}
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

        <MentionInput
          as="textarea"
          name="content"
          placeholder="Digite seu recado aqui... use @ para mencionar moradores"
          rows={3}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm resize-none"
        />

        <label className="flex items-center gap-2 text-sm font-bold">
          <span>Categoria:</span>
          <select
            name="category"
            defaultValue={DEFAULT_CATEGORY}
            className="flex-1 p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
          >
            {POST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>

        {previewUrl && (
          <div className="relative inline-block">
            <Image
              src={previewUrl}
              alt="Pré-visualização da imagem"
              width={1200}
              height={900}
              unoptimized
              className="h-auto w-auto max-w-full max-h-80 object-contain bg-mural-creme retro-border"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1 right-1 bg-red-800 text-white text-xs font-bold px-2 py-1 retro-border"
            >
              ✕ Remover
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="bg-mural-creme text-mural-dark px-3 py-2 text-sm font-bold retro-border retro-button-active cursor-pointer">
            🖼️ {previewUrl ? "Trocar imagem" : "Anexar imagem"}
            <input
              ref={fileInputRef}
              type="file"
              name="image"
              accept={ALLOWED_POST_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
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
