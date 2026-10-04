import type { IconName } from "@/app/ui/icons";

export type NavItem = { href: string; label: string; short: string; icon: IconName };

export const navItems: NavItem[] = [
  { href: "/", label: "Painel", short: "Painel", icon: "painel" },
  { href: "/contas", label: "Contas a pagar", short: "Contas", icon: "contas" },
  { href: "/gastos", label: "Gastos", short: "Gastos", icon: "gastos" },
  { href: "/caixa", label: "Caixa", short: "Caixa", icon: "caixa" },
  { href: "/orcamento", label: "Orçamento", short: "Orçamento", icon: "orcamento" },
  { href: "/dividas", label: "Dívidas", short: "Dívidas", icon: "dividas" },
  { href: "/agenda", label: "Agenda", short: "Agenda", icon: "agenda" },
  { href: "/integracoes", label: "Integrações", short: "Integrações", icon: "plug" },
  { href: "/usuarios", label: "Usuários", short: "Usuários", icon: "usuarios" },
];

// Barra do celular: Painel, Contas, [+ novo gasto no centro], Gastos, Mais.
export const tabLeft = navItems.slice(0, 2);
export const tabRight = navItems.slice(2, 3);
export const moreItems = navItems.slice(3);
