import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Figtree } from "next/font/google";
import { Frame } from "./ui/kv";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
// Slab de xilogravura: só para títulos e para os números que lideram a tela.
const alfa = Alfa_Slab_One({ variable: "--font-alfa", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Casa Mamaco",
  description: "Gestão da casa: contas, caixa, gastos, orçamento e agenda.",
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: "Casa Mamaco", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fae9cf",
  viewportFit: "cover",
};

const theme = process.env.NEXT_PUBLIC_THEME === "xepa" ? "xepa" : "cordel";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-theme={theme}
      className={`${figtree.variable} ${alfa.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Frame />
        {children}
      </body>
    </html>
  );
}
