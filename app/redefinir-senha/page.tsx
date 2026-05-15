import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import RedefinirSenhaForm from "@/components/RedefinirSenhaForm";

export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só chega aqui logado, vindo do link mágico via /auth/confirm
  if (!user) {
    redirect("/esqueci-senha");
  }

  return <RedefinirSenhaForm />;
}
