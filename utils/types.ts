export type Profile = {
  id: string;
  nickname: string | null;
  avatar_seed: string | null;
  // Caminho da foto enviada (bucket `avatars`); null = usa o avatar_seed
  avatar_path: string | null;
  // Apresentação curta no perfil público (até 280 chars)
  bio: string | null;
  // Marca quando o morador completou (ou pulou) o fluxo de /bem-vindo.
  // Null = vai cair no onboarding no próximo acesso à home.
  onboarded_at: string | null;
  role: Role;
  updated_at?: string | null;
  created_at?: string | null;
};

import type { ReactionEmoji } from "./reactions";
import type { PostCategory } from "./categories";
import type { Role } from "./roles";

export type Reaction = {
  id: number;
  post_id: number;
  user_id: string;
  emoji: ReactionEmoji;
};

export type Comment = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  author_name: string;
  created_at: string;
  parent_comment_id: number | null;
};

export type Bookmark = {
  user_id: string;
  post_id: number;
};

export type Post = {
  id: number;
  content: string;
  author_name: string;
  user_id: string;
  created_at: string;
  // Galeria ordenada (0..MAX_POST_IMAGES). Array vazio = recado sem imagem.
  image_paths: string[];
  category: PostCategory;
};

export type PostWithRelations = Post & {
  profiles: Pick<
    Profile,
    "nickname" | "avatar_seed" | "avatar_path" | "role"
  > | null;
  reactions: Pick<Reaction, "user_id" | "emoji">[];
  comments: Comment[];
  // RLS privada: vem só a linha do próprio usuário (vazio = não salvou).
  bookmarks: Pick<Bookmark, "user_id">[];
};

export type NotificationType =
  | "like"
  | "comment"
  | "mention"
  | "reaction"
  | "follow"
  | "reply";

export type Notification = {
  id: number;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: number | null;
  comment_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "nickname" | "avatar_seed" | "avatar_path"> | null;
};

// Agenda da cidade. 'pendente' = sugerido por morador, aguardando staff;
// 'aprovado' = público; 'recusado' = barrado (só o autor/staff enxerga).
export type EventStatus = "pendente" | "aprovado" | "recusado";

export type CityEvent = {
  id: number;
  title: string;
  description: string | null;
  starts_at: string;
  location: string;
  status: EventStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CityEventWithAuthor = CityEvent & {
  suggester: Pick<Profile, "nickname" | "avatar_seed" | "avatar_path"> | null;
};
