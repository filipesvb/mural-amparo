// Moderação automática de imagens via OpenAI omni-moderation (gratuita).
// Roda no servidor antes do post/avatar ser persistido — se qualquer imagem
// for flagada, a action deleta o arquivo do Storage e devolve erro pro
// usuário.
//
// Setup: ver notas/image_moderation_setup.md. Sem `OPENAI_API_KEY` no env
// a moderação fica em pass-through (loga warning, deixa subir) — assim o
// app não quebra antes da config estar feita.

import { postImageUrl, avatarImageUrl } from "@/utils/storage";

interface ModerationResult {
  ok: boolean;
  // Categoria que disparou o bloqueio, pra UX e log.
  reason?: string;
}

// Categorias que bloqueiam upload imediatamente. As demais (assédio, etc.)
// dependem mais de contexto textual — pra imagem ficamos no que é visualmente
// inequívoco.
const HARD_BLOCK_CATEGORIES = [
  "sexual",
  "sexual/minors",
  "violence",
  "violence/graphic",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
] as const;

const CATEGORY_LABEL_PT: Record<string, string> = {
  sexual: "conteúdo sexual",
  "sexual/minors": "conteúdo sexual envolvendo menores",
  violence: "violência",
  "violence/graphic": "violência gráfica",
  "self-harm": "automutilação",
  "self-harm/intent": "intenção de automutilação",
  "self-harm/instructions": "instruções de automutilação",
};

interface OpenAIModerationResponse {
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
  }>;
}

async function moderateUrl(url: string, apiKey: string): Promise<ModerationResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url } }],
      }),
    });

    if (!res.ok) {
      console.error(
        "Moderação de imagem: OpenAI retornou",
        res.status,
        await res.text(),
      );
      // Em caso de falha do serviço, deixamos passar (fail-open) e logamos.
      // Bloqueio reativo via denúncia continua valendo.
      return { ok: true };
    }

    const data = (await res.json()) as OpenAIModerationResponse;
    const result = data.results?.[0];
    if (!result?.flagged) return { ok: true };

    const triggered = HARD_BLOCK_CATEGORIES.find(
      (cat) => result.categories[cat] === true,
    );
    if (triggered) {
      return {
        ok: false,
        reason: CATEGORY_LABEL_PT[triggered] ?? triggered,
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("Moderação de imagem: erro na chamada:", err);
    return { ok: true }; // fail-open
  }
}

// Modera uma lista de paths de post (caminhos dentro do bucket
// `post-images`). Retorna OK se TODAS passarem; informa o motivo da
// primeira que falhar.
export async function moderatePostImages(
  paths: string[],
): Promise<ModerationResult> {
  if (paths.length === 0) return { ok: true };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "OPENAI_API_KEY ausente — moderação automática de imagens desligada.",
    );
    return { ok: true };
  }

  for (const path of paths) {
    const url = postImageUrl(path);
    const result = await moderateUrl(url, apiKey);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// Mesmo, mas pro avatar (bucket `avatars`).
export async function moderateAvatarImage(
  path: string | null | undefined,
): Promise<ModerationResult> {
  if (!path) return { ok: true };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "OPENAI_API_KEY ausente — moderação automática de imagens desligada.",
    );
    return { ok: true };
  }

  const url = avatarImageUrl(path);
  return moderateUrl(url, apiKey);
}
