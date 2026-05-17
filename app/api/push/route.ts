// Recebe o Supabase Database Webhook em INSERT de `notifications` e dispara
// o web-push pras inscrições do destinatário. Lê push_subscriptions/profiles
// com a SERVICE ROLE KEY (sem sessão de usuário) — RLS continua fechada pro
// resto do app. Setup (VAPID, env, criar o webhook): notas/creating_push_subscriptions_schema.sql
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { describeNotification } from "@/utils/notifications.copy";
import type { NotificationType } from "@/utils/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookBody = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: number;
    recipient_id: string;
    actor_id: string | null;
    type: string;
    post_id: number | null;
    comment_id: number | null;
  } | null;
};

const KNOWN_TYPES: NotificationType[] = [
  "like",
  "comment",
  "mention",
  "reaction",
  "follow",
  "reply",
];

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (
    !url ||
    !serviceKey ||
    !vapidPublic ||
    !vapidPrivate ||
    !vapidSubject
  ) {
    console.error("Push: variáveis de ambiente ausentes.");
    return NextResponse.json(
      { error: "Push não configurado" },
      { status: 500 },
    );
  }

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (
    body.type !== "INSERT" ||
    body.table !== "notifications" ||
    !body.record
  ) {
    return NextResponse.json({ skipped: true });
  }
  const n = body.record;

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", n.recipient_id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let actorName = "Alguém";
  let actorNickname: string | null = null;
  if (n.actor_id) {
    const { data: actor } = await admin
      .from("profiles")
      .select("nickname")
      .eq("id", n.actor_id)
      .single();
    if (actor?.nickname) {
      actorName = actor.nickname;
      actorNickname = actor.nickname;
    }
  }

  const isKnown = (KNOWN_TYPES as string[]).includes(n.type);
  const { action, icon } = isKnown
    ? describeNotification(n.type as NotificationType, !!n.comment_id)
    : { action: "interagiu com você", icon: "🔔" };

  // Para onde o clique leva: recado → âncora no feed; follow → perfil do autor.
  let target = "/";
  if (n.post_id) {
    target = `/#recado-${n.post_id}`;
  } else if (n.type === "follow" && actorNickname) {
    target = `/perfil/${encodeURIComponent(actorNickname)}`;
  }

  const payload = JSON.stringify({
    title: "Mural Amparo",
    body: `${actorName} ${action} ${icon}`,
    icon: "/icons/icon-192.png",
    url: target,
    tag: `notif-${n.id}`,
  });

  let sent = 0;
  let pruned = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 = inscrição morta (device desinstalou/expirou): limpa.
        if (status === 404 || status === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint as string);
          pruned++;
        } else {
          console.error("Falha ao enviar push:", status, err);
        }
      }
    }),
  );

  return NextResponse.json({ sent, pruned });
}
