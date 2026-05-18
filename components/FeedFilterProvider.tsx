"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { PostCategory } from "@/utils/categories";

export type FeedScope = "seguindo" | null;

type FeedFilterValue = {
  category: PostCategory | null;
  feed: FeedScope;
  isLoggedIn: boolean;
  // true enquanto a lista re-renderiza após troca de filtro/escopo —
  // alimenta o feedback visual (o feed esmaece por um instante).
  isPending: boolean;
  setCategory: (category: PostCategory | null) => void;
  setFeed: (feed: FeedScope) => void;
};

const FeedFilterContext = createContext<FeedFilterValue | null>(null);

// Monta a URL equivalente ao estado de filtros (mesmo formato de antes:
// ?feed=seguindo&cat=eventos). Mantém o link compartilhável e o servidor
// continua tratando esses params num carregamento direto (SEO/refresh).
function buildUrl(feed: FeedScope, category: PostCategory | null) {
  const params = new URLSearchParams();
  if (feed === "seguindo") params.set("feed", "seguindo");
  if (category) params.set("cat", category);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function FeedFilterProvider({
  initialCategory,
  initialFeed,
  isLoggedIn,
  children,
}: {
  initialCategory: PostCategory | null;
  initialFeed: FeedScope;
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategoryState] = useState<PostCategory | null>(
    initialCategory,
  );
  const [feed, setFeedState] = useState<FeedScope>(initialFeed);

  // Atualiza a URL sem disparar navegação de servidor: o filtro é
  // instantâneo (estado local) e o endereço continua sincronizado.
  const syncUrl = useCallback(
    (nextFeed: FeedScope, nextCategory: PostCategory | null) => {
      window.history.replaceState(null, "", buildUrl(nextFeed, nextCategory));
    },
    [],
  );

  const setCategory = useCallback(
    (next: PostCategory | null) => {
      syncUrl(feed, next);
      startTransition(() => setCategoryState(next));
    },
    [feed, syncUrl],
  );

  const setFeed = useCallback(
    (next: FeedScope) => {
      // "Seguindo" exige login (mesma regra da proteção página a página).
      if (next === "seguindo" && !isLoggedIn) {
        router.push("/login");
        return;
      }
      // Trocar de feed limpa a categoria (mesma UX dos links antigos).
      syncUrl(next, null);
      startTransition(() => {
        setFeedState(next);
        setCategoryState(null);
      });
    },
    [isLoggedIn, router, syncUrl],
  );

  const value = useMemo<FeedFilterValue>(
    () => ({ category, feed, isLoggedIn, isPending, setCategory, setFeed }),
    [category, feed, isLoggedIn, isPending, setCategory, setFeed],
  );

  return (
    <FeedFilterContext.Provider value={value}>
      {children}
    </FeedFilterContext.Provider>
  );
}

export function useFeedFilter() {
  const ctx = useContext(FeedFilterContext);
  if (!ctx) {
    throw new Error("useFeedFilter deve ser usado dentro de FeedFilterProvider");
  }
  return ctx;
}
