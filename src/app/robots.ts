import type { MetadataRoute } from "next";

// Site privado: nenhum buscador ou robô deve indexar nada.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
