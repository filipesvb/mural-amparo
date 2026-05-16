// Server-only: usa next/headers via createClient. Nunca importar em Client Components.
import { createClient } from "@/utils/supabase/server";

// IDs dos moradores que `userId` segue (base do feed "Seguindo").
export async function fetchFollowingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  return (data ?? []).map((f) => f.following_id as string);
}
