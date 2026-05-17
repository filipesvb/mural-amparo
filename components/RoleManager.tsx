"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/app/actions";
import { asRole, type Role } from "@/utils/roles";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";

type Row = {
  id: string;
  nickname: string | null;
  avatar_seed: string | null;
  avatar_path: string | null;
  role: Role;
};

export default function RoleManager({ profiles }: { profiles: Row[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = query.trim()
    ? profiles.filter((p) =>
        (p.nickname ?? "")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : profiles;

  function changeRole(id: string, role: "morador" | "moderador") {
    setError("");
    setBusyId(id);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("target_id", id);
      fd.set("role", role);
      const result = await setUserRole(fd);
      if (result?.error) setError(result.error);
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrar por apelido..."
        className="w-full p-2 bg-mural-creme border-2 border-mural-dark focus:outline-none text-sm"
      />

      {error && (
        <div className="p-2 bg-red-100 border-2 border-red-800 text-red-800 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      <ul className="divide-y divide-mural-line border-2 border-mural-dark bg-white">
        {filtered.length === 0 && (
          <li className="p-4 text-xs italic text-mural-ink/50 text-center">
            Nenhum morador encontrado.
          </li>
        )}
        {filtered.map((p) => {
          const role = asRole(p.role);
          const isStaffTarget = role === "admin";
          const rowBusy = busyId === p.id && isPending;
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 p-3 text-sm"
            >
              <span className="w-9 h-9 bg-mural-creme rounded-lg ring-1 ring-mural-line overflow-hidden shrink-0">
                <Avatar
                  avatarPath={p.avatar_path}
                  seed={p.avatar_seed}
                  name={p.nickname}
                  size={36}
                />
              </span>
              <span className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-bold truncate">
                  {p.nickname ?? "(sem apelido)"}
                </span>
                <RoleBadge role={role} />
              </span>

              {role === "admin" ? (
                <span className="text-[11px] italic text-mural-ink/50 shrink-0">
                  Admin (gerencie via SQL)
                </span>
              ) : role === "moderador" ? (
                <button
                  type="button"
                  disabled={rowBusy || isStaffTarget}
                  onClick={() => changeRole(p.id, "morador")}
                  className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg border-2 border-mural-dark bg-mural-creme disabled:opacity-50"
                >
                  {rowBusy ? "..." : "↓ Rebaixar a morador"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => changeRole(p.id, "moderador")}
                  className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-mural-brown text-white retro-button-active disabled:opacity-50"
                >
                  {rowBusy ? "..." : "↑ Promover a moderador"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
