"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { createPost } from "@/app/actions";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/utils/types";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  POST_IMAGES_BUCKET,
} from "@/utils/storage";
import { uploadImage, removeImage } from "@/utils/upload.client";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
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
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function reset() {
    clearImage();
    setError("");
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  // Se o morador não estiver logado, o widget vira um convite pra entrar.
  // Nada de avatar gerado aleatório aqui — só um marcador neutro.
  if (!user) {
    return (
      <a
        href="/login"
        className="soft-card p-3 md:p-4 flex items-center justify-between gap-2 hover:bg-mural-creme transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg ring-1 ring-mural-line bg-mural-creme shrink-0 flex items-center justify-center text-mural-ink/35">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span className="text-mural-ink/45 italic text-sm md:text-base">
            Entre para postar um recado...
          </span>
        </div>
        <span className="bg-mural-brown text-white px-4 py-2 rounded-lg text-xs md:text-sm font-bold shrink-0">
          Entrar
        </span>
      </a>
    );
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

  return (
    <form
      action={async (formData) => {
        setError("");
        setPending(true);
        let uploadedPath: string | null = null;
        try {
          // Sobe a imagem direto do navegador (a Server Action recebe só o
          // caminho — a Vercel barra arquivos grandes no payload da action).
          if (selectedFile) {
            const up = await uploadImage(
              POST_IMAGES_BUCKET,
              user.id,
              selectedFile,
            );
            if ("error" in up) {
              setError(up.error);
              return;
            }
            uploadedPath = up.path;
            formData.set("image_path", up.path);
          }
          const result = await createPost(formData);
          if (result?.error) {
            // Não deixa a imagem órfã se o recado não foi publicado.
            if (uploadedPath) {
              await removeImage(POST_IMAGES_BUCKET, uploadedPath);
            }
            setError(result.error);
            return;
          }
          reset();
        } catch {
          if (uploadedPath) {
            await removeImage(POST_IMAGES_BUCKET, uploadedPath);
          }
          setError("Algo deu errado. Tente novamente.");
        } finally {
          setPending(false);
        }
      }}
      className="soft-card p-3 md:p-4 space-y-3"
    >
      <HoneypotField />
      <div className="flex items-flex-start gap-3">
        {avatar}
        <div className="flex-1" onFocus={() => setIsFocused(true)}>
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
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-mural-creme border border-mural-line hover:bg-white cursor-pointer text-mural-ink/55 hover:text-mural-ink transition-colors shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_POST_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <select
            name="category"
            defaultValue={DEFAULT_CATEGORY}
            aria-label="Categoria do recado"
            className="flex-1 min-w-0 px-3 py-2 text-sm bg-mural-creme border border-mural-line rounded-lg focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
          >
            {POST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={pending}
            className="bg-mural-brown text-white px-4 md:px-6 py-2 text-sm md:text-base font-bold rounded-lg retro-button-active shrink-0 disabled:opacity-60"
          >
            {pending ? "Enviando..." : "+ Escrever"}
          </button>
        </div>
      </div>
    </form>
  );
}
