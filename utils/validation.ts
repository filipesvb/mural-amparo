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

// Sugestão de evento. date/time chegam separados (inputs nativos) e a action
// combina num timestamptz; aqui validamos só o formato.
export const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "O título precisa de ao menos 3 caracteres")
    .max(120, "O título deve ter no máximo 120 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "A descrição deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .min(3, "Informe onde o evento acontece")
    .max(120, "O local deve ter no máximo 120 caracteres"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
});

export type EventInput = z.infer<typeof eventSchema>;
