"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { completeOnboarding } from "@/app/actions";
import Avatar from "./Avatar";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  AVATARS_BUCKET,
} from "@/utils/storage";
import { uploadImage, removeImage } from "@/utils/upload.client";

interface OnboardingFlowProps {
  userId: string;
  suggestedNickname: string;
}

const BIO_MAX = 280;

export default function OnboardingFlow({
  userId,
  suggestedNickname,
}: OnboardingFlowProps) {
  const [nickname, setNickname] = useState(suggestedNickname);
  const [bio, setBio] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) {
      clearFile();
      return;
    }
    if (!(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      clearFile();
      return;
    }
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setError("Imagem muito grande. O limite é 5 MB.");
      clearFile();
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      let uploadedPath: string | null = null;
      try {
        if (selectedFile) {
          const up = await uploadImage(AVATARS_BUCKET, userId, selectedFile);
          if ("error" in up) {
            setError(up.error);
            return;
          }
          uploadedPath = up.path;
          formData.set("avatar_path", up.path);
        }
        const result = await completeOnboarding(formData);
        if (result?.error) {
          if (uploadedPath) await removeImage(AVATARS_BUCKET, uploadedPath);
          setError(result.error);
        }
      } catch {
        if (uploadedPath) await removeImage(AVATARS_BUCKET, uploadedPath);
        setError("Algo deu errado. Tente novamente.");
      }
    });
  }

  const bioRemaining = BIO_MAX - bio.length;

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Pré-visualização do avatar */}
      <div className="flex flex-col items-center justify-center p-4 bg-white retro-border border-dashed">
        <div className="w-24 h-24 bg-mural-brown retro-border overflow-hidden mb-2">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Pré-visualização da foto"
              width={96}
              height={96}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <Avatar
              seed={nickname || "morador"}
              name={nickname}
              size={96}
              alt="Avatar"
            />
          )}
        </div>
        <p className="text-[10px] font-bold text-mural-brown uppercase">
          {previewUrl ? "Sua foto" : "Avatar gerado a partir do apelido"}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Apelido <span className="text-red-700">*</span>
        </label>
        <input
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm font-bold"
          placeholder="Ex: ZeDaPadaria"
          required
          maxLength={30}
        />
        <p className="mt-1 text-[10px] text-mural-dark/60">
          É como os outros moradores vão te chamar. Letras, números e _ (2-30 caracteres).
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Bio <span className="text-mural-dark/50 normal-case">(opcional)</span>
        </label>
        <textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm resize-none"
          placeholder="Um pouco sobre você... onde mora, o que faz, do que gosta."
          rows={3}
          maxLength={BIO_MAX}
        />
        <p className="mt-1 text-[10px] text-mural-dark/60 text-right">
          {bioRemaining} caracteres restantes
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Foto de perfil <span className="text-mural-dark/50 normal-case">(opcional)</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:border-2 file:border-mural-dark file:bg-mural-creme file:text-mural-dark file:font-bold file:cursor-pointer"
        />
        {previewUrl && (
          <button
            type="button"
            onClick={clearFile}
            className="mt-2 text-[11px] font-bold text-red-700 underline"
          >
            🗑️ Remover (voltar ao avatar gerado)
          </button>
        )}
        <p className="mt-1 text-[10px] text-mural-dark/50">
          JPG, PNG, WebP ou GIF · até 5 MB. Sem foto? Geramos um avatar a partir do seu apelido.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-mural-brown text-white p-3 font-bold retro-border retro-button-active disabled:opacity-50"
      >
        {isPending ? "Entrando..." : "Entrar no Mural 🌳"}
      </button>

      <p className="text-[11px] text-center text-mural-dark/60 italic">
        Você pode mudar tudo isso depois em <strong>Editar perfil</strong>.
      </p>
    </form>
  );
}
