"use client";

import { createClient } from "@/utils/supabase/client";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_BYTES,
  postImageExtension,
} from "@/utils/storage";

// Sobe a imagem direto do navegador pro Supabase Storage. Antes o arquivo
// viajava no payload da Server Action, e a Vercel barra requests acima de
// ~4,5 MB (limite de plataforma, abaixo do nosso limite de 5 MB) — então
// em produção o upload falhava. A RLS do bucket já restringe o INSERT à
// pasta `<user_id>/` do próprio morador, então isto é seguro.
export async function uploadImage(
  bucket: string,
  userId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  if (!(ALLOWED_POST_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Formato inválido. Use JPG, PNG, WebP ou GIF." };
  }
  if (file.size > MAX_POST_IMAGE_BYTES) {
    return { error: "Imagem muito grande. O limite é 5 MB." };
  }

  const ext = postImageExtension(file.type)!;
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Erro ao subir imagem:", error);
    return { error: "Não foi possível enviar a imagem." };
  }

  return { path };
}

// Sobe a galeria inteira em paralelo. Se qualquer arquivo falhar (formato,
// tamanho ou rede), remove os que já subiram e devolve o erro — nada de
// galeria pela metade nem arquivo órfão no Storage.
export async function uploadImages(
  bucket: string,
  userId: string,
  files: File[],
): Promise<{ paths: string[] } | { error: string }> {
  const results = await Promise.all(
    files.map((f) => uploadImage(bucket, userId, f)),
  );
  const paths: string[] = [];
  let firstError: string | null = null;
  for (const r of results) {
    if ("error" in r) {
      if (!firstError) firstError = r.error;
    } else {
      paths.push(r.path);
    }
  }
  if (firstError) {
    if (paths.length) await removeImages(bucket, paths);
    return { error: firstError };
  }
  return { paths };
}

// Best-effort: usado pra limpar o arquivo recém-enviado quando a Server
// Action falha depois do upload (rate limit, validação, erro no insert).
export async function removeImage(bucket: string, path: string) {
  const supabase = createClient();
  await supabase.storage.from(bucket).remove([path]);
}

export async function removeImages(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  const supabase = createClient();
  await supabase.storage.from(bucket).remove(paths);
}
