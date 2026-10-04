import type { IconName } from "@/app/ui/icons";

export type NavItem = { href: string; label: string; short: string; icon: IconName };

export const navItems: NavItem[] = [
  { href: "/", label: "Painel", short: "Painel", icon: "painel" },
  { href: "/relatorio", label: "Relatório", short: "Relatório", icon: "relatorio" },
  { href: "/contas", label: "Contas a pagar", short: "Contas", icon: "contas" },
  { href: "/gastos", label: "Gastos", short: "Gastos", icon: "gastos" },
  { href: "/caixa", label: "Caixa", short: "Caixa", icon: "caixa" },
  { href: "/orcamento", label: "Orçamento", short: "Orçamento", icon: "orcamento" },
  { href: "/dividas", label: "Dívidas", short: "Dívidas", icon: "dividas" },
  { href: "/integracoes", label: "Integrações", short: "Integrações", icon: "plug" },
  { href: "/usuarios", label: "Usuários", short: "Usuários", icon: "usuarios" },
];

// Barra do celular: Painel, Contas, [+ novo gasto no centro], Gastos, Mais.
export const tabLeft = [navItems[0], navItems[2]]; // Painel, Contas
export const tabRight = [navItems[3]]; // Gastos
export const moreItems = [navItems[1], ...navItems.slice(4)]; // Relatório e o resto
