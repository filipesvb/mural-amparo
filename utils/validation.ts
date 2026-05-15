import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

// Mesmo conjunto de caracteres aceito pela regex de menções
// (utils/mentions.ts e notas/creating_mentions_schema.md).
export const nicknameSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_]{2,30}$/,
    "Apelido deve ter de 2 a 30 caracteres usando apenas letras, números e _",
  );
