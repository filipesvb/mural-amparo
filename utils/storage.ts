export const POST_IMAGES_BUCKET = "post-images";

export const AVATARS_BUCKET = "avatars";

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

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
