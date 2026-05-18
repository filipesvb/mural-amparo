"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

// Abre a imagem do recado dentro do próprio app (overlay), em vez de mandar
// pro link cru do Supabase numa aba nova. Fecha no ✕, no Esc ou clicando
// fora da foto. Renderiza via portal no <body> pra escapar dos containers
// com overflow/altura fixa do layout.
export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Trava o scroll do fundo enquanto o overlay está aberto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar imagem"
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/90 hover:text-white hover:bg-black/60 transition-colors text-lg"
      >
        ✕
      </button>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1200}
        sizes="100vw"
        onClick={(e) => e.stopPropagation()}
        className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-lg"
      />
    </div>,
    document.body,
  );
}
