import Image from "next/image";
import { avatarImageUrl } from "@/utils/storage";

// Avatar único do app: usa a foto enviada (avatar_path) quando existe;
// senão cai no avatar gerado pelo DiceBear a partir da seed (fallback).
// Sem "use client" de propósito — serve a Server e Client Components.
// O wrapper (tamanho/borda/arredondamento) fica a cargo de quem usa;
// aqui só preenchemos a caixa com object-cover.
export default function Avatar({
  avatarPath,
  seed,
  name,
  size,
  alt = "",
  className = "h-full w-full object-cover",
}: {
  avatarPath?: string | null;
  seed?: string | null;
  name?: string | null;
  size: number;
  alt?: string;
  className?: string;
}) {
  const src = avatarPath
    ? avatarImageUrl(avatarPath)
    : `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(
        (seed || name || "morador").trim(),
      )}`;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
