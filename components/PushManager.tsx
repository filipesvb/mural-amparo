"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/app/actions";

// Chave pública VAPID precisa virar Uint8Array pro applicationServerKey.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Detecção de ambiente (síncrona, sem efeito). Este componente só monta
// client-side (dentro do dropdown do sino), então ler window/navigator no
// inicializador do useState é seguro — não roda no SSR.
function detectEnv() {
  if (typeof window === "undefined") {
    return { hasPush: false, iosHint: false };
  }
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;
  const isIOS =
    /ipad|iphone|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
    !("MSStream" in window);
  const hasPush =
    "serviceWorker" in navigator && "PushManager" in window;
  // iOS só expõe Push depois de instalado na tela inicial.
  return { hasPush, iosHint: !hasPush && isIOS && !isStandalone };
}

export default function PushManager() {
  const [env] = useState(detectEnv);
  const [supported, setSupported] = useState(env.hasPush);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!env.hasPush) return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscribed(!!sub);
      })
      .catch(() => {
        if (!cancelled) setSupported(false);
      });
    return () => {
      cancelled = true;
    };
  }, [env.hasPush]);

  async function subscribe() {
    setError("");
    if (!VAPID_PUBLIC_KEY) {
      setError("Push não configurado (chave VAPID ausente).");
      return;
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError(
          perm === "denied"
            ? "Notificações bloqueadas — libere nas configurações do navegador."
            : "Permissão não concedida.",
        );
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const serialized = JSON.parse(JSON.stringify(sub));
      const result = await savePushSubscription(serialized);
      if (result?.error) {
        await sub.unsubscribe();
        setError(result.error);
        return;
      }
      setSubscribed(true);
    } catch (e) {
      console.error("Erro ao assinar push:", e);
      setError("Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setError("");
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      console.error("Erro ao cancelar push:", e);
      setError("Não foi possível desativar as notificações.");
    } finally {
      setBusy(false);
    }
  }

  if (env.iosHint) {
    return (
      <div className="px-3 py-2 border-b border-mural-line bg-mural-creme/50 text-[10px] text-mural-ink/70 leading-snug">
        📲 Para receber avisos no iPhone, toque em{" "}
        <span className="font-bold">Compartilhar ⎋</span> e{" "}
        <span className="font-bold">Adicionar à Tela de Início</span>.
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="px-3 py-2 border-b border-mural-line bg-mural-creme/50 text-[10px] italic text-mural-ink/50">
        Notificações push não suportadas neste navegador.
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-mural-line bg-mural-creme/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-mural-ink/70">
          🔔 Avisos no aparelho
        </span>
        <button
          type="button"
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={busy}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border retro-button-active disabled:opacity-50 ${
            subscribed
              ? "bg-mural-card text-mural-ink border-mural-line"
              : "bg-mural-brown text-white border-mural-brown"
          }`}
        >
          {busy ? "..." : subscribed ? "Desativar" : "Ativar"}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-red-700 italic">⚠️ {error}</p>
      )}
    </div>
  );
}
