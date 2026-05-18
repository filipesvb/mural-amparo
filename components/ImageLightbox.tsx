"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

// Abre a galeria do recado dentro do próprio app (overlay), em vez de mandar
// pro link cru do Supabase. Navega entre as fotos com ‹ ›, setas do teclado
// ou clicando nas miniaturas. Fecha no ✕, no Esc ou clicando fora.
// Renderiza via portal no <body> pra escapar dos containers com
// overflow/altura fixa do layout.
export default function ImageLightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);

  const count = images.length;
  const multi = count > 1;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (!multi) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    // Trava o scroll do fundo enquanto o overlay está aberto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, go, multi]);

  if (count === 0) return null;

  const arrowBtn =
    "absolute top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/90 hover:text-white hover:bg-black/60 transition-colors text-xl";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Imagem do recado"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar imagem"
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/90 hover:text-white hover:bg-black/60 transition-colors text-lg"
      >
        ✕
      </button>

      {multi && (
        <>
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/40 text-white/90 text-sm font-bold">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Imagem anterior"
            className={`${arrowBtn} left-4`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Próxima imagem"
            className={`${arrowBtn} right-4`}
          >
            ›
          </button>
        </>
      )}

      <Image
        src={images[index]}
        alt={`Imagem ${index + 1} do recado`}
        width={1600}
        height={1200}
        sizes="100vw"
        onClick={(e) => e.stopPropagation()}
        className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-lg"
      />

      {multi && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex gap-2"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === index}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                i === index
                  ? "border-white"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
