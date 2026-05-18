"use client";

import Image from "next/image";
import { postImageUrl } from "@/utils/storage";

// Colagem das imagens do recado no feed (estilo Twitter): 1 natural, 2 lado
// a lado, 3 com uma alta à esquerda, 4 em grade 2x2. O teto é 4
// (MAX_POST_IMAGES), então tudo aparece — sem overlay "+N". Clicar abre o
// lightbox já no índice tocado.
export default function PostGallery({
  paths,
  onOpen,
}: {
  paths: string[];
  onOpen: (index: number) => void;
}) {
  if (paths.length === 0) return null;

  const sizes = "(max-width: 768px) 100vw, 28rem";

  // Uma imagem: mantém o comportamento antigo (aspecto natural, sem cortar).
  if (paths.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        aria-label="Abrir imagem do recado"
        className="inline-block mb-4 cursor-zoom-in"
      >
        <Image
          src={postImageUrl(paths[0])}
          alt="Imagem do recado"
          width={1200}
          height={900}
          sizes={sizes}
          className="h-auto w-auto max-w-full max-h-112 object-contain rounded-lg border border-mural-line bg-mural-creme"
        />
      </button>
    );
  }

  // 2+: cada célula tem aspect-ratio próprio (altura definida) pra o
  // next/image `fill` ter onde renderizar — não dependemos da faixa do grid.
  const cell = (index: number, className: string) => (
    <button
      key={paths[index]}
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Abrir imagem ${index + 1} de ${paths.length}`}
      className={`relative cursor-zoom-in bg-mural-creme overflow-hidden ${className}`}
    >
      <Image
        src={postImageUrl(paths[index])}
        alt={`Imagem ${index + 1} do recado`}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </button>
  );

  const frame =
    "mb-4 grid grid-cols-2 gap-1 rounded-lg overflow-hidden border border-mural-line";

  if (paths.length === 2) {
    return (
      <div className={frame}>
        {cell(0, "aspect-square")}
        {cell(1, "aspect-square")}
      </div>
    );
  }

  if (paths.length === 3) {
    // Banner no topo + duas quadradas embaixo.
    return (
      <div className={frame}>
        {cell(0, "col-span-2 aspect-[2/1]")}
        {cell(1, "aspect-square")}
        {cell(2, "aspect-square")}
      </div>
    );
  }

  return (
    <div className={frame}>
      {cell(0, "aspect-square")}
      {cell(1, "aspect-square")}
      {cell(2, "aspect-square")}
      {cell(3, "aspect-square")}
    </div>
  );
}
