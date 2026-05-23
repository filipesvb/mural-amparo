"use client";

// Compartilhar recado via WhatsApp. Em mobile abre o app; no desktop, o
// WhatsApp Web. Não precisa de login pra compartilhar — qualquer um vendo
// o feed público pode mandar pra um amigo. Driver de crescimento orgânico
// (o link tem preview OG já configurado em app/opengraph-image.tsx).

const SITE_URL = "https://www.mural-amparo.com.br";
const SHARE_CONTENT_LIMIT = 140;

export default function SharePostButton({
  postId,
  content,
  authorName,
}: {
  postId: number;
  content: string;
  authorName: string;
}) {
  const trimmedContent =
    content.length > SHARE_CONTENT_LIMIT
      ? content.slice(0, SHARE_CONTENT_LIMIT).trimEnd() + "…"
      : content;

  const lines = [
    trimmedContent ? `"${trimmedContent}" — ${authorName}` : `Recado de ${authorName} no Mural Amparo`,
    "",
    `${SITE_URL}/#recado-${postId}`,
  ];
  const message = lines.join("\n");
  const href = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Compartilhar no WhatsApp"
      className="flex items-center gap-1 rounded-full border bg-mural-card border-mural-line text-mural-ink/55 hover:bg-green-50 hover:border-green-600 hover:text-green-700 transition-colors px-2 md:px-2.5 py-1 text-[11px] md:text-xs cursor-pointer"
    >
      <span className="text-sm md:text-base">📲</span>
      <span className="hidden sm:inline">Compartilhar</span>
    </a>
  );
}
