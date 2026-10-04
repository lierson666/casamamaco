import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans, Fraunces } from "next/font/google";
import { Frame } from "./ui/kv";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

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
      className={`${dmSans.variable} ${anton.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Frame />
        {children}
      </body>
    </html>
  );
}
