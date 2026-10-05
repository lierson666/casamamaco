import { and, eq } from "drizzle-orm";
import { logout } from "@/app/actions/auth";
import { MobileNav, SidebarNav } from "@/app/ui/nav";
import { Seal } from "@/app/ui/kv";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  // Dados do "+ Novo gasto" (folha rápida do celular), disponíveis em qualquer tela.
  const { categories, accounts, users } = schema;
  const quick = {
    categories: db.select({ id: categories.id, name: categories.name }).from(categories).where(and(eq(categories.kind, "despesa"), eq(categories.archived, false))).all(),
    accounts: db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(eq(accounts.archived, false)).all(),
    users: db.select({ id: users.id, name: users.name }).from(users).all(),
    me: user.id,
    today: today(),
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop: lombada de caderno, em tinta, com o menu */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-ink px-4 py-7 text-bg min-[900px]:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2">
            <Seal size={44} />
            <span className="font-display text-lg leading-tight">
              Casa
              <br />
              Mamaco
            </span>
          </div>
          <SidebarNav />
        </div>
        <form action={logout} className="flex items-center justify-between gap-2 px-2 text-sm">
          <span className="truncate opacity-70">{user.name}</span>
          <button className="rounded-[var(--radius)] border border-bg/40 px-3 py-1 hover:bg-bg/10">Sair</button>
        </form>
      </aside>

      <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col px-4 pb-40 min-[900px]:px-8 min-[900px]:pb-10">
        {/* Celular: barra de topo de app, fixa, com área segura */}
        <header className="app-top sticky top-0 z-20 -mx-4 flex items-center gap-3 px-4 py-2.5 min-[900px]:hidden">
          <Seal size={38} />
          <span className="font-display text-lg">Casa Mamaco</span>
        </header>
        <main className="flex-1 pt-3 min-[900px]:pt-8">{children}</main>
      </div>

      <MobileNav userName={user.name} quick={quick} />
    </div>
  );
}
