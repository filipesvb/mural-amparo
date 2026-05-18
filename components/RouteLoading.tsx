// Fallback de navegação: aparece na hora ao clicar num link enquanto a
// próxima página carrega (Next prefetcha este fallback). Dá o "algo
// aconteceu" que faltava entre o clique e a tela nova.
export default function RouteLoading({
  label = "Carregando...",
}: {
  label?: string;
}) {
  return (
    <div className="min-h-[50vh] w-full flex flex-col items-center justify-center gap-3 p-8 text-mural-ink/60">
      <span
        aria-hidden
        className="w-8 h-8 border-[3px] border-mural-brown border-t-transparent rounded-full animate-spin"
      />
      <p className="text-sm italic">{label}</p>
    </div>
  );
}
