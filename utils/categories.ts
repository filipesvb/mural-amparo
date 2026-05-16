export const POST_CATEGORIES = [
  { value: "geral", label: "Geral", icon: "📌" },
  { value: "achados", label: "Achados & Perdidos", icon: "🔍" },
  { value: "eventos", label: "Eventos", icon: "📅" },
  { value: "servicos", label: "Serviços", icon: "🛠️" },
  { value: "noticias", label: "Notícias", icon: "📰" },
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number]["value"];

export const DEFAULT_CATEGORY: PostCategory = "geral";

export function isPostCategory(value: unknown): value is PostCategory {
  return (
    typeof value === "string" &&
    POST_CATEGORIES.some((c) => c.value === value)
  );
}

export function categoryMeta(value: string) {
  return (
    POST_CATEGORIES.find((c) => c.value === value) ?? POST_CATEGORIES[0]
  );
}
