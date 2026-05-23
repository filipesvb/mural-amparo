import { ImageResponse } from "next/og";

// OG image padrão (1200x630) gerada no edge — usada por toda página que não
// definir a sua própria. Aparece como preview ao compartilhar o Mural no
// WhatsApp, Telegram, Twitter, Slack, etc.

export const runtime = "edge";
export const alt = "Mural Amparo — Onde a cidade se encontra, um recado de cada vez";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #b5803f 0%, #9b6a3f 60%, #6f4a2a 100%)",
          color: "#f4ede4",
          fontFamily: "Georgia, serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
            textShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          Mural Amparo
        </div>
        <div
          style={{
            fontSize: 42,
            marginTop: 40,
            opacity: 0.92,
            fontStyle: "italic",
            fontWeight: 400,
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Onde a cidade se encontra, um recado de cada vez.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 50,
            fontSize: 24,
            opacity: 0.7,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontFamily: "Tahoma, sans-serif",
            fontWeight: 700,
          }}
        >
          mural-amparo.com.br
        </div>
      </div>
    ),
    size,
  );
}
