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
import Avatar from "./Avatar";
import HoneypotField from "./HoneypotField";
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

  const avatar = (
    <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-mural-line bg-mural-creme shrink-0">
      <Avatar
        avatarPath={profile?.avatar_path}
        seed={profile?.avatar_seed}
        name={profile?.nickname || user?.email?.split("@")[0]}
        size={40}
        alt="seu avatar"
      />
    </div>
  );

  // Se o morador não estiver logado, o botão leva para o login
  if (!user) {
    return (
      <a
        href="/login"
        className="soft-card p-4 flex items-center justify-between gap-2 hover:bg-mural-creme transition-colors"
      >
        <span className="text-mural-ink/45 italic">
          Entre para postar um recado em Amparo...
        </span>
        <span className="bg-mural-brown text-white px-4 py-1.5 rounded-lg text-sm font-bold">
          🔑 Entrar
        </span>
      </a>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="soft-card p-4 w-full flex items-center gap-3 text-left hover:bg-mural-creme transition-colors"
      >
        {avatar}
        <span className="flex-1 text-mural-ink/45 italic">
          O que está acontecendo, {profile?.nickname}?
        </span>
        <span className="bg-mural-brown text-white px-4 py-1.5 rounded-lg text-sm font-bold shrink-0">
          + Escrever
        </span>
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
      className="soft-card p-4"
    >
      <HoneypotField />
      <div className="flex items-center gap-3 mb-3">
        {avatar}
        <h3 className="flex-1 font-bold text-mural-ink">
          {profile?.nickname || user.email?.split("@")[0]}
        </h3>
        <button
          type="button"
          onClick={reset}
          className="text-mural-ink/40 hover:text-mural-ink text-sm font-bold"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-2 text-red-800 text-xs font-bold">
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
          className="w-full p-3 bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30 text-sm resize-none"
        />

        {previewUrl && (
          <div className="relative inline-block">
            <Image
              src={previewUrl}
              alt="Pré-visualização da imagem"
              width={1200}
              height={900}
              unoptimized
              className="h-auto w-auto max-w-full max-h-80 object-contain rounded-lg border border-mural-line bg-mural-creme"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1 right-1 bg-red-700/90 text-white text-xs font-bold px-2 py-1 rounded-lg"
            >
              ✕ Remover
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label
            title="Anexar imagem"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-mural-creme border border-mural-line hover:bg-white cursor-pointer"
          >
            🖼️
            <input
              ref={fileInputRef}
              type="file"
              name="image"
              accept={ALLOWED_POST_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <select
            name="category"
            defaultValue={DEFAULT_CATEGORY}
            className="px-3 py-2 bg-mural-creme border border-mural-line rounded-lg focus:outline-none text-sm"
          >
            {POST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="ml-auto bg-mural-brown text-white px-6 py-2 font-bold rounded-lg retro-button-active"
          >
            + Escrever
          </button>
        </div>
      </div>
    </form>
  );
}
