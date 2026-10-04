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
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 min-[900px]:px-6">
      {/* Desktop: barra lateral fixa */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between py-6 min-[900px]:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2">
            <Seal size={44} />
            <span className="font-display text-xl uppercase leading-none tracking-wide">
              Casa
              <br />
              Mamaco
            </span>
          </div>
          <SidebarNav />
        </div>
        <form action={logout} className="flex items-center justify-between gap-2 px-2 text-sm">
          <span className="truncate text-muted">{user.name}</span>
          <button className="btn-ghost shrink-0">Sair</button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-40 min-[900px]:pb-10">
        {/* Celular: barra de topo de app, fixa, com área segura */}
        <header className="app-top sticky top-0 z-20 -mx-4 flex items-center gap-3 px-4 py-2.5 min-[900px]:hidden">
          <Seal size={38} />
          <span className="font-display text-xl uppercase tracking-wide">Casa Mamaco</span>
        </header>
        <main className="flex-1 pt-2 min-[900px]:pt-6">{children}</main>
      </div>

      <MobileNav userName={user.name} quick={quick} />
    </div>
  );
}
