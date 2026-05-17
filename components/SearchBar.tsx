"use client";

import Link from "next/link";
import Avatar from "./Avatar";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchAll,
  type SearchPostHit,
  type SearchProfileHit,
  type SearchResults,
} from "@/app/actions";

const EMPTY: SearchResults = { profiles: [], posts: [] };

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults(EMPTY);
        return;
      }
      startTransition(async () => {
        const r = await searchAll(trimmed);
        setResults(r);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [trimmed]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const hasResults = results.profiles.length > 0 || results.posts.length > 0;
  const showDropdown = open && trimmed.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="🔎 Buscar moradores ou recados"
        className="w-full px-4 py-2 text-sm bg-mural-creme text-mural-ink rounded-full border border-mural-line shadow-sm focus:outline-none focus:ring-2 focus:ring-mural-brown/30"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-mural-card border border-mural-line rounded-xl shadow-lg text-mural-ink max-h-96 overflow-y-auto">
          {!hasResults && !isPending && (
            <div className="p-4 text-xs italic opacity-60 text-center">
              Nenhum resultado para “{trimmed}”.
            </div>
          )}
          {isPending && !hasResults && (
            <div className="p-4 text-xs italic opacity-60 text-center">
              Buscando...
            </div>
          )}

          {results.profiles.length > 0 && (
            <section>
              <div className="bg-mural-creme px-3 py-1.5 border-b border-mural-line text-[10px] font-bold uppercase text-mural-ink/60">
                Moradores
              </div>
              <ul>
                {results.profiles.map((p) => (
                  <li key={p.nickname}>
                    <ProfileRow profile={p} onClick={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.posts.length > 0 && (
            <section>
              <div className="bg-mural-creme px-3 py-1.5 border-y border-mural-line text-[10px] font-bold uppercase text-mural-ink/60">
                Recados
              </div>
              <ul>
                {results.posts.map((post) => (
                  <li key={post.id}>
                    <PostRow post={post} onClick={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileRow({
  profile,
  onClick,
}: {
  profile: SearchProfileHit;
  onClick: () => void;
}) {
  return (
    <Link
      href={`/perfil/${encodeURIComponent(profile.nickname)}`}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 hover:bg-mural-creme border-b border-mural-line"
    >
      <span className="w-7 h-7 bg-mural-creme rounded-lg ring-1 ring-mural-line overflow-hidden shrink-0">
        <Avatar
          avatarPath={profile.avatar_path}
          seed={profile.avatar_seed}
          name={profile.nickname}
          size={28}
        />
      </span>
      <span className="text-xs font-bold">@{profile.nickname}</span>
    </Link>
  );
}

function PostRow({
  post,
  onClick,
}: {
  post: SearchPostHit;
  onClick: () => void;
}) {
  const author = post.author_nickname ?? post.author_name;
  const excerpt =
    post.content.length > 120
      ? post.content.slice(0, 120).trimEnd() + "…"
      : post.content;
  const href = post.author_nickname
    ? `/perfil/${encodeURIComponent(post.author_nickname)}#recado-${post.id}`
    : null;

  const body = (
    <>
      <span className="w-7 h-7 bg-mural-creme rounded-lg ring-1 ring-mural-line overflow-hidden shrink-0">
        <Avatar
          avatarPath={post.author_avatar_path}
          seed={post.author_avatar_seed}
          name={post.author_nickname || post.author_name}
          size={28}
        />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold opacity-70">{author}</p>
        <p className="text-xs truncate">{excerpt}</p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 border-b border-mural-line">
        {body}
      </div>
    );
  }
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-start gap-2 px-3 py-2 hover:bg-mural-creme border-b border-mural-line"
    >
      {body}
    </Link>
  );
}
