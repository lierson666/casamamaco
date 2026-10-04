import { logout } from "@/app/actions/auth";
import { BottomNav, SidebarNav } from "@/app/ui/nav";
import { Seal } from "@/app/ui/kv";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 md:px-6">
      {/* Desktop: barra lateral fixa */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between py-6 md:flex">
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

      <div className="flex min-w-0 flex-1 flex-col pb-28 md:pb-10">
        {/* Celular: barra de topo compacta */}
        <header className="flex items-center justify-between gap-3 py-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <Seal size={36} />
            <span className="font-display text-lg uppercase tracking-wide">Casa Mamaco</span>
          </div>
          <form action={logout}>
            <button className="btn-ghost">Sair</button>
          </form>
        </header>
        <main className="flex-1 md:pt-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
