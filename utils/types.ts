export type Profile = {
  id: string;
  nickname: string | null;
  avatar_seed: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

import type { ReactionEmoji } from "./reactions";
import type { PostCategory } from "./categories";

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
};

export type Post = {
  id: number;
  content: string;
  author_name: string;
  user_id: string;
  created_at: string;
  image_path: string | null;
  category: PostCategory;
};

export type PostWithRelations = Post & {
  profiles: Pick<Profile, "nickname" | "avatar_seed"> | null;
  reactions: Pick<Reaction, "user_id" | "emoji">[];
  comments: Comment[];
};

export type NotificationType =
  | "like"
  | "comment"
  | "mention"
  | "reaction";

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
  actor: Pick<Profile, "nickname" | "avatar_seed"> | null;
};
