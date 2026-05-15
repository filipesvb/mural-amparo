import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (!profile?.nickname) redirect("/perfil/editar");
  redirect(`/perfil/${encodeURIComponent(profile.nickname)}`);
}
