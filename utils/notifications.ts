import { createClient } from "@/utils/supabase/server";
import type { NotificationWithActor } from "@/utils/types";

export async function fetchInitialNotifications(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!actor_id (nickname, avatar_seed)
    `,
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  return {
    notifications: (data ?? []) as NotificationWithActor[],
    unreadCount: count ?? 0,
  };
}
