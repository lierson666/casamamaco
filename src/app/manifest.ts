import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa Mamaco",
    short_name: "Casa Mamaco",
    description: "Gestão da casa: contas, caixa, gastos, orçamento e agenda.",
    start_url: "/",
    display: "standalone",
    background_color: "#12291c",
    theme_color: "#12291c",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
