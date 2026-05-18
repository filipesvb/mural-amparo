export const POST_IMAGES_BUCKET = "post-images";

export const AVATARS_BUCKET = "avatars";

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Teto de imagens por recado (galeria). Barreira de produto/custo: cada
// imagem é um arquivo no Storage e peso no payload do feed.
export const MAX_POST_IMAGES = 4;

export const ALLOWED_POST_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function postImageExtension(mimeType: string): string | null {
  return EXT_BY_TYPE[mimeType] ?? null;
}

export const ALLOWED_IMAGE_EXTENSIONS = Object.values(EXT_BY_TYPE);

// O upload da imagem agora acontece no navegador (direto pro Supabase
// Storage); a Server Action recebe só o caminho. Esta validação garante,
// no servidor, que o caminho pertence à pasta do próprio usuário e tem
// extensão permitida — a RLS do bucket é a barreira definitiva.
export function isOwnedImagePath(
  value: unknown,
  userId: string,
): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("..")) return false;
  if (!value.startsWith(`${userId}/`)) return false;
  const ext = value.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

// Valida a lista de caminhos vinda do cliente (galeria). Devolve a lista
// se TODOS pertencem à pasta do próprio usuário e o teto é respeitado;
// null se veio algo inválido (o app pede reenvio em vez de gravar lixo).
// A RLS do bucket continua sendo a barreira definitiva.
export function ownedImagePaths(
  values: unknown[],
  userId: string,
): string[] | null {
  if (values.length === 0) return [];
  if (values.length > MAX_POST_IMAGES) return null;
  const out: string[] = [];
  for (const v of values) {
    if (!isOwnedImagePath(v, userId)) return null;
    out.push(v);
  }
  return out;
}

// Monta a URL pública do objeto. Bucket é público, então a URL é fixa e
// não expira — não precisa assinar nada.
export function postImageUrl(imagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${POST_IMAGES_BUCKET}/${imagePath}`;
}

// Idem para a foto de perfil (bucket `avatars`, também público).
export function avatarImageUrl(avatarPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${avatarPath}`;
}
