import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// URL canônica usada pra resolver caminhos relativos (OG image, etc.) e como
// `og:url` padrão. Em dev/preview, links compartilhados continuam apontando
// pra produção — preferimos isso a quebrar previews fora do prod.
const SITE_URL = "https://www.mural-amparo.com.br";
const SITE_DESCRIPTION =
  "O mural comunitário de Amparo-SP: avisos, achados, eventos, serviços e a vida do bairro num lugar só.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mural Amparo",
    template: "%s · Mural Amparo",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Mural Amparo",
  // Next injeta o <link rel="manifest"> a partir de app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: "Mural Amparo",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/icons/icon-192.png",
  },
  // OG image vem automaticamente de app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Mural Amparo",
    title: "Mural Amparo",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Mural Amparo",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#9b6a3f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
