"use client";

import { useRef, useState, useEffect } from "react";
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
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)) {
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
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const textareaContainer = event.currentTarget;
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }

    if (isFocused) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isFocused]);

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
        className="soft-card p-3 md:p-4 flex items-center justify-between gap-2 hover:bg-mural-creme transition-colors"
      >
        <div className="flex items-center gap-3">
          {avatar}
          <span className="text-mural-ink/45 italic text-sm md:text-base">
            Entre para postar um recado...
          </span>
        </div>
        <span className="bg-mural-brown text-white px-4 py-2 rounded-lg text-xs md:text-sm font-bold shrink-0">
          🔑 Entrar
        </span>
      </a>
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
      className="soft-card p-3 md:p-4 space-y-3"
    >
      <HoneypotField />
      <div className="flex items-flex-start gap-3">
        {avatar}
        <div
          className="flex-1"
          onFocus={() => setIsFocused(true)}
        >
          <MentionInput
            as="textarea"
            name="content"
            placeholder={`O que está acontecendo, ${profile?.nickname}?`}
            rows={1}
            className="w-full p-3 rounded-lg focus:outline-none text-sm"
          />
        </div>
      </div>

      <div
        ref={containerRef}
        onFocus={() => setIsFocused(true)}
        className={`border-t border-dashed border-mural-line pt-3 space-y-3 ${
          isFocused ? "block" : "hidden"
        } md:block`}
      >
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

        <div className="flex items-center gap-2">
          <label
            title="Anexar imagem"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-mural-creme border border-mural-line hover:bg-white cursor-pointer text-lg transition-colors"
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
            className="px-2 py-1 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none"
          >
            {POST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="ml-auto bg-mural-brown text-white px-4 md:px-6 py-2 text-sm md:text-base font-bold rounded-lg retro-button-active shrink-0"
          >
            + Escrever
          </button>
        </div>
      </div>
    </form>
  );
}
