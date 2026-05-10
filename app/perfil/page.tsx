import { createClient } from "@/utils/supabase/server";
import { updateProfile } from "@/app/actions";
import Link from "next/link";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  return (
    <main className="h-screen p-4 flex justify-center items-center bg-mural-creme">
      <div className="w-full max-w-md bg-white retro-border shadow-lg overflow-hidden">
        <header className="wood-header-footer p-3 border-b-2 flex justify-between items-center text-white">
          <h1 className="font-bold">Configurar Perfil</h1>
          <Link
            href="/"
            className="text-xs bg-mural-dark px-2 border border-white"
          >
            [X] Voltar
          </Link>
        </header>

        <form action={updateProfile} className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4 py-4 bg-mural-green/20 retro-border">
            <img
              src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile?.avatar_seed}`}
              className="w-24 h-24 bg-mural-brown retro-border"
              alt="Preview do Avatar"
            />
            <p className="text-[10px] uppercase font-bold opacity-60">
              Prévia do seu Avatar
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                Seu Apelido no Mural:
              </label>
              <input
                name="nickname"
                defaultValue={profile?.nickname}
                className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none"
                placeholder="Ex: ZeDaPadaria"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Semente do Avatar (mude o texto para trocar o desenho):
              </label>
              <input
                name="avatar_seed"
                defaultValue={profile?.avatar_seed}
                className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none"
                placeholder="Qualquer palavra..."
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-mural-brown text-white p-3 font-bold retro-border retro-button-active"
          >
            Salvar Alterações ✅
          </button>
        </form>
      </div>
    </main>
  );
}
