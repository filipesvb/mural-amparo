"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { createPost } from "@/app/actions";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/utils/types";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  MAX_POST_IMAGES,
  POST_IMAGES_BUCKET,
} from "@/utils/storage";
import { uploadImages, removeImages } from "@/utils/upload.client";
import { POST_CATEGORIES, DEFAULT_CATEGORY } from "@/utils/categories";
import Avatar from "./Avatar";
import HoneypotField from "./HoneypotField";
import MentionInput from "./MentionInput";

type Picked = { file: File; previewUrl: string };

export default function CreatePostWidget({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Espelha picked pra revogar os object URLs no unmount sem recriar o efeito.
  const pickedRef = useRef<Picked[]>([]);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => {
    return () => {
      pickedRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  function clearImages() {
    picked.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPicked([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAt(index: number) {
    setPicked((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const files = Array.from(e.target.files ?? []);
    // Permite o mesmo input vazio (cancelou o seletor) sem zerar o que já
    // foi escolhido — a remoção é feita pelo ✕ de cada miniatura.
    if (files.length === 0) return;

    const accepted: Picked[] = [];
    for (const file of files) {
      if (
        !(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)
      ) {
        setError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
        continue;
      }
      if (file.size > MAX_POST_IMAGE_BYTES) {
        setError("Cada imagem deve ter no máximo 5 MB.");
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setPicked((prev) => {
      const room = MAX_POST_IMAGES - prev.length;
      if (room <= 0) {
        accepted.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setError(`Máximo de ${MAX_POST_IMAGES} imagens por recado.`);
        return prev;
      }
      if (accepted.length > room) {
        accepted
          .slice(room)
          .forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setError(`Máximo de ${MAX_POST_IMAGES} imagens por recado.`);
      }
      return [...prev, ...accepted.slice(0, room)];
    });
    // Zera o input pra permitir re-selecionar o mesmo arquivo depois.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function reset() {
    clearImages();
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

  const atLimit = picked.length >= MAX_POST_IMAGES;

  return (
    <form
      action={async (formData) => {
        setError("");
        setPending(true);
        let uploadedPaths: string[] = [];
        try {
          // Sobe as imagens direto do navegador (a Server Action recebe só os
          // caminhos — a Vercel barra arquivos grandes no payload da action).
          if (picked.length > 0) {
            const up = await uploadImages(
              POST_IMAGES_BUCKET,
              user.id,
              picked.map((p) => p.file),
            );
            if ("error" in up) {
              setError(up.error);
              return;
            }
            uploadedPaths = up.paths;
            for (const path of up.paths) {
              formData.append("image_paths", path);
            }
          }
          const result = await createPost(formData);
          if (result?.error) {
            // Não deixa imagem órfã se o recado não foi publicado.
            if (uploadedPaths.length) {
              await removeImages(POST_IMAGES_BUCKET, uploadedPaths);
            }
            setError(result.error);
            return;
          }
          reset();
        } catch {
          if (uploadedPaths.length) {
            await removeImages(POST_IMAGES_BUCKET, uploadedPaths);
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

        {picked.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {picked.map((p, i) => (
              <div
                key={p.previewUrl}
                className="relative aspect-square rounded-lg overflow-hidden border border-mural-line bg-mural-creme"
              >
                <Image
                  src={p.previewUrl}
                  alt={`Pré-visualização ${i + 1}`}
                  fill
                  unoptimized
                  sizes="120px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remover imagem ${i + 1}`}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-red-700/90 text-white text-xs font-bold rounded-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label
            title={
              atLimit
                ? `Máximo de ${MAX_POST_IMAGES} imagens`
                : "Anexar imagens"
            }
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border border-mural-line transition-colors shrink-0 ${
              atLimit
                ? "bg-mural-creme/60 text-mural-ink/25 cursor-not-allowed"
                : "bg-mural-creme hover:bg-white cursor-pointer text-mural-ink/55 hover:text-mural-ink"
            }`}
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
            {picked.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 flex items-center justify-center bg-mural-brown text-white text-[10px] font-bold rounded-full">
                {picked.length}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_POST_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              disabled={atLimit}
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
