"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { MENTION_REGEX, extractMentions } from "@/utils/mentions";
import { HASHTAG_REGEX, canonicalTag } from "@/utils/hashtags";

type MentionStatus = "valid" | "invalid";

type MentionsContextValue = {
  statuses: Map<string, MentionStatus>;
  ensureValidated: (text: string) => void;
};

const MentionsContext = createContext<MentionsContextValue | null>(null);

export function MentionsProvider({
  initialValidMentions,
  children,
}: {
  initialValidMentions: string[];
  children: React.ReactNode;
}) {
  const [statuses, setStatuses] = useState<Map<string, MentionStatus>>(() => {
    const m = new Map<string, MentionStatus>();
    for (const nick of initialValidMentions) m.set(nick, "valid");
    return m;
  });
  // Acompanha quais nicks estão em validação para evitar disparar query repetida
  const pendingRef = useRef<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  const ensureValidated = useCallback(
    (text: string) => {
      const nicks = extractMentions(text);
      const toCheck: string[] = [];
      for (const nick of nicks) {
        if (statuses.has(nick) || pendingRef.current.has(nick)) continue;
        pendingRef.current.add(nick);
        toCheck.push(nick);
      }
      if (toCheck.length === 0) return;

      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("nickname")
          .in("nickname", toCheck);
        const found = new Set((data ?? []).map((p) => p.nickname as string));
        setStatuses((prev) => {
          const next = new Map(prev);
          for (const nick of toCheck) {
            next.set(nick, found.has(nick) ? "valid" : "invalid");
            pendingRef.current.delete(nick);
          }
          return next;
        });
      })();
    },
    [statuses, supabase],
  );

  const value = useMemo(
    () => ({ statuses, ensureValidated }),
    [statuses, ensureValidated],
  );

  return (
    <MentionsContext.Provider value={value}>
      {children}
    </MentionsContext.Provider>
  );
}

function useMentions() {
  const ctx = useContext(MentionsContext);
  if (!ctx) {
    throw new Error("useMentions usado fora de MentionsProvider");
  }
  return ctx;
}

export function RenderWithMentions({ text }: { text: string }) {
  const { statuses, ensureValidated } = useMentions();

  useEffect(() => {
    ensureValidated(text);
  }, [text, ensureValidated]);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  // Regex combinada: grupo 1 = @menção, grupo 2 = #hashtag
  const regex = new RegExp(
    `${MENTION_REGEX.source}|${HASHTAG_REGEX.source}`,
    "g",
  );
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const nickname = match[1];
    const hashtag = match[2];
    if (hashtag !== undefined) {
      // Hashtag sempre vira link (não há validação)
      parts.push(
        <Link
          key={key++}
          href={`/tag/${canonicalTag(hashtag)}`}
          className="font-bold text-mural-brown hover:underline"
        >
          #{hashtag}
        </Link>,
      );
    } else if (statuses.get(nickname) === "valid") {
      parts.push(
        <Link
          key={key++}
          href={`/perfil/${encodeURIComponent(nickname)}`}
          className="font-bold text-mural-brown hover:underline"
        >
          @{nickname}
        </Link>,
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return <>{parts}</>;
}
