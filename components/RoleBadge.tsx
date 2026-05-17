import { ROLE_BADGE, type Role } from "@/utils/roles";

// Selo de papel ao lado do nome. `morador` (ou ausente) não renderiza nada.
export default function RoleBadge({
  role,
  className = "",
}: {
  role: Role | null | undefined;
  className?: string;
}) {
  const meta = role ? ROLE_BADGE[role] : null;
  if (!meta) return null;

  return (
    <span
      title={meta.label}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${meta.className} ${className}`}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
