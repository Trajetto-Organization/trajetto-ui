import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trajetto - Sistema de Gestão de Frotas",
    short_name: "Trajetto",
    description:
      "Sistema avançado de gestão de frotas para empresas que buscam eficiência e controle total de suas operações logísticas.",
    start_url: "/",
    display: "browser", // No PWA, just browser
    background_color: "#f8fafc",
    theme_color: "#7c3aed",
    orientation: "portrait-primary",
    scope: "/",
    lang: "pt-BR",

    // Basic icons for SEO and bookmarks
    icons: [
      {
        src: "/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],

    // Categories for SEO
    categories: [
      "negócios",
      "produtividade",
      "logística",
      "gestão de frota",
      "empresas",
      "sistema empresarial",
    ],
  };
}
