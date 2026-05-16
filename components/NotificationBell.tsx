"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type {
  Notification,
  NotificationType,
  NotificationWithActor,
  Profile,
} from "@/utils/types";
import { markNotificationsRead } from "@/app/actions";

const MAX_VISIBLE = 10;

export default function NotificationBell({
  user,
  initialNotifications,
  initialUnreadCount,
}: {
  user: User;
  initialNotifications: NotificationWithActor[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  });

  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as Notification;
          let actor: Pick<Profile, "nickname" | "avatar_seed"> | null = null;
          if (newNotif.actor_id) {
            const { data } = await supabase
              .from("profiles")
              .select("nickname, avatar_seed")
              .eq("id", newNotif.actor_id)
              .single();
            actor = data;
          }
          setNotifications((prev) =>
            [{ ...newNotif, actor }, ...prev].slice(0, MAX_VISIBLE),
          );
          if (!newNotif.read_at) setUnreadCount((c) => c + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const oldId = (payload.old as Partial<{ id: number }>).id;
          if (!oldId) return;
          const existing = notificationsRef.current.find(
            (n) => n.id === oldId,
          );
          if (existing && !existing.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          setNotifications((prev) => prev.filter((n) => n.id !== oldId));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user.id]);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  async function handleToggle() {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && unreadCount > 0) {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: now })),
      );
      setUnreadCount(0);
      await markNotificationsRead();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notificações"
        className="relative text-mural-creme p-1 retro-button-active"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full px-1 min-w-4.5 text-center border border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white retro-border shadow-lg z-20 text-mural-dark">
          <div className="bg-mural-panel px-3 py-2 border-b-2 border-mural-dark text-xs font-bold uppercase">
            Notificações
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-xs italic opacity-60 text-center">
              Nada por aqui ainda.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2 border-b border-mural-dark/10 ${n.read_at ? "" : "bg-mural-creme"}`}
                >
                  <NotificationRow notif={n} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function describeNotification(type: NotificationType, hasComment: boolean) {
  switch (type) {
    case "like":
      return { action: "curtiu seu recado", icon: "❤️" };
    case "reaction":
      return { action: "reagiu ao seu recado", icon: "😊" };
    case "follow":
      return { action: "começou a te seguir", icon: "👥" };
    case "comment":
      return { action: "comentou no seu recado", icon: "💬" };
    case "reply":
      return { action: "respondeu seu comentário", icon: "↩️" };
    case "mention":
      return {
        action: hasComment
          ? "te mencionou em um comentário"
          : "te mencionou em um recado",
        icon: "📣",
      };
  }
}

function NotificationRow({ notif }: { notif: NotificationWithActor }) {
  const actorName = notif.actor?.nickname ?? "Alguém";
  const { action, icon } = describeNotification(notif.type, !!notif.comment_id);
  const avatarSeed = (
    notif.actor?.avatar_seed ||
    notif.actor?.nickname ||
    "morador"
  ).trim();

  return (
    <div className="flex items-start gap-2 text-xs">
      <div className="w-8 h-8 bg-mural-brown retro-border overflow-hidden shrink-0">
        <Image
          src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(avatarSeed)}`}
          alt={`avatar de ${actorName}`}
          width={32}
          height={32}
        />
      </div>
      <div className="flex-1">
        <p>
          <span className="font-bold">{actorName}</span> {action} {icon}
        </p>
        <p className="text-[10px] opacity-60">
          {new Date(notif.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
