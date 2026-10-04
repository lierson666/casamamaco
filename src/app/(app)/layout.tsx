import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";

const nav = [
  { href: "/", label: "Painel" },
  { href: "/contas", label: "Contas a pagar" },
  { href: "/caixa", label: "Caixa" },
  { href: "/gastos", label: "Gastos" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/dividas", label: "Dívidas" },
  { href: "/agenda", label: "Agenda" },
  { href: "/usuarios", label: "Usuários" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-10">
      <header className="flex items-center justify-between gap-4 py-4">
        <span className="text-lg font-semibold">Casa Mamaco</span>
        <form action={logout} className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500">{user.name}</span>
          <button className="rounded-md border border-zinc-300 px-2.5 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Sair
          </button>
        </form>
      </header>
      <nav
        aria-label="Seções"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 text-sm"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
