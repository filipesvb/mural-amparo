"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { PostCategory } from "@/utils/categories";

export type FeedScope = "seguindo" | null;

type FeedFilterValue = {
  category: PostCategory | null;
  feed: FeedScope;
  isLoggedIn: boolean;
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
      setCategoryState(next);
      syncUrl(feed, next);
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
      setFeedState(next);
      setCategoryState(null);
      syncUrl(next, null);
    },
    [isLoggedIn, router, syncUrl],
  );

  const value = useMemo<FeedFilterValue>(
    () => ({ category, feed, isLoggedIn, setCategory, setFeed }),
    [category, feed, isLoggedIn, setCategory, setFeed],
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
