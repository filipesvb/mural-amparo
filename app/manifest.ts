import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mural Amparo",
    short_name: "Mural",
    description:
      "Onde a cidade se encontra, um recado de cada vez. O mural comunitário de Amparo.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4ede4",
    theme_color: "#9b6a3f",
    lang: "pt-BR",
    orientation: "portrait",
    categories: ["social", "news"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
