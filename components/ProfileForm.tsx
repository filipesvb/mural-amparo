"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { updateProfile } from "@/app/actions";
import Avatar from "./Avatar";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  AVATARS_BUCKET,
} from "@/utils/storage";
import { uploadImage, removeImage } from "@/utils/upload.client";
import type { Profile } from "@/utils/types";

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [seed, setSeed] = useState(profile?.avatar_seed || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Tem foto enviada e o usuário não pediu pra remover nem escolheu outra
  const showsCurrentPhoto =
    !!profile?.avatar_path && !removeAvatar && !previewUrl;

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
    setRemoveAvatar(false);
  }

  function handleRemovePhoto() {
    clearFile();
    setRemoveAvatar(true);
  }

  async function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      let uploadedPath: string | null = null;
      try {
        // Sobe a foto direto do navegador; a Server Action recebe só o
        // caminho (a Vercel barra arquivos grandes no payload da action).
        if (selectedFile) {
          if (!profile?.id) {
            setError("Recarregue a página e tente novamente.");
            return;
          }
          const up = await uploadImage(
            AVATARS_BUCKET,
            profile.id,
            selectedFile,
          );
          if ("error" in up) {
            setError(up.error);
            return;
          }
          uploadedPath = up.path;
          formData.set("avatar_path", up.path);
        }
        const result = await updateProfile(formData);
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

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Preview do avatar: foto escolhida > foto atual > avatar gerado */}
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
          ) : showsCurrentPhoto ? (
            <Avatar
              avatarPath={profile?.avatar_path}
              size={96}
              alt="Sua foto de perfil"
            />
          ) : (
            <Avatar seed={seed} name={nickname} size={96} alt="Avatar gerado" />
          )}
        </div>
        <p className="text-[10px] font-bold text-mural-brown uppercase">
          {previewUrl || showsCurrentPhoto
            ? "Foto de perfil"
            : "Avatar gerado (sem foto)"}
        </p>
      </div>

      {error && (
        <div className="p-2 bg-red-100 border-2 border-red-800 text-red-800 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-mural-dark">
          Foto de perfil (opcional):
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:border-2 file:border-mural-dark file:bg-mural-creme file:text-mural-dark file:font-bold file:cursor-pointer"
        />
        {(previewUrl || showsCurrentPhoto) && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="mt-2 text-[11px] font-bold text-red-700 underline"
          >
            🗑️ Remover foto (voltar ao avatar gerado)
          </button>
        )}
        {removeAvatar && (
          <>
            <input type="hidden" name="remove_avatar" value="1" />
            <p className="mt-1 text-[11px] italic text-mural-dark/70">
              A foto será removida ao salvar.
            </p>
          </>
        )}
        <p className="mt-1 text-[10px] text-mural-dark/50">
          JPG, PNG, WebP ou GIF · até 5 MB.
        </p>
      </div>

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
          Semente do Avatar (usada quando não há foto):
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
