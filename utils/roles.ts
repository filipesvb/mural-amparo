export const ROLES = ["morador", "moderador", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "morador";

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

// Normaliza qualquer valor (string do banco, null) para um Role válido.
export function asRole(value: unknown): Role {
  return isRole(value) ? value : DEFAULT_ROLE;
}

// Pode apagar qualquer recado/comentário.
export function canModerate(role: Role | null | undefined): boolean {
  return role === "moderador" || role === "admin";
}

// Pode gerenciar papéis (painel /admin).
export function isAdmin(role: Role | null | undefined): boolean {
  return role === "admin";
}

// Meta do selo. `morador` não tem selo (null).
export const ROLE_BADGE: Record<
  Role,
  { label: string; icon: string; className: string } | null
> = {
  morador: null,
  moderador: {
    label: "Moderador",
    icon: "🛡️",
    className: "bg-mural-green/30 text-mural-ink border-mural-green",
  },
  admin: {
    label: "Admin",
    icon: "⭐",
    className: "bg-mural-brown/20 text-mural-ink border-mural-brown",
  },
};
