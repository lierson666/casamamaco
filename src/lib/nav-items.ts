import type { IconName } from "@/app/ui/icons";

export type NavItem = { href: string; label: string; icon: IconName };

export const navItems: NavItem[] = [
  { href: "/", label: "Painel", icon: "painel" },
  { href: "/contas", label: "Contas a pagar", icon: "contas" },
  { href: "/caixa", label: "Caixa", icon: "caixa" },
  { href: "/gastos", label: "Gastos", icon: "gastos" },
  { href: "/orcamento", label: "Orçamento", icon: "orcamento" },
  { href: "/dividas", label: "Dívidas", icon: "dividas" },
  { href: "/agenda", label: "Agenda", icon: "agenda" },
  { href: "/usuarios", label: "Usuários", icon: "usuarios" },
];

// No celular: 4 atalhos na barra de baixo + "Mais" (o resto fica em /mais).
export const bottomItems = navItems.slice(0, 4);
export const moreItems = navItems.slice(4);
