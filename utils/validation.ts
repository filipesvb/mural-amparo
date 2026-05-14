import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
