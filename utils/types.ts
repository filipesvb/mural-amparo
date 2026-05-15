export type Profile = {
  id: string;
  nickname: string | null;
  avatar_seed: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type Like = {
  id: number;
  post_id: number;
  user_id: string;
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
};

export type PostWithRelations = Post & {
  profiles: Pick<Profile, "nickname" | "avatar_seed"> | null;
  likes: Pick<Like, "user_id">[];
  comments: Comment[];
};

export type NotificationType = "like" | "comment" | "mention";

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
