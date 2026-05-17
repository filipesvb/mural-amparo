// Texto/ícone de cada tipo de notificação. Função pura (sem next/headers nem
// supabase) pra ser usada tanto no Client Component do sino quanto na Route
// Handler /api/push — copy de notificação fica num lugar só.
import type { NotificationType } from "@/utils/types";

export function describeNotification(
  type: NotificationType,
  hasComment: boolean,
): { action: string; icon: string } {
  switch (type) {
    case "like":
      return { action: "curtiu seu recado", icon: "❤️" };
    case "reaction":
      return { action: "reagiu ao seu recado", icon: "😊" };
    case "follow":
      return { action: "começou a te seguir", icon: "👥" };
    case "comment":
      return { action: "comentou no seu recado", icon: "💬" };
    case "reply":
      return { action: "respondeu seu comentário", icon: "↩️" };
    case "mention":
      return {
        action: hasComment
          ? "te mencionou em um comentário"
          : "te mencionou em um recado",
        icon: "📣",
      };
  }
}
