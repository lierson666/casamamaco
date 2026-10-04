"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";
import { moreItems, navItems, tabLeft, tabRight, type NavItem } from "@/lib/nav-items";
import { ExpenseForm } from "./expense-form";
import { Icon } from "./icons";

export const NEW_EXPENSE_EVENT = "casa:novo-gasto";

export type QuickAdd = {
  categories: { id: number; name: string }[];
  accounts: { id: number; name: string }[];
  users: { id: number; name: string }[];
  me: number;
  today: string;
};

const isActive = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(href + "/");

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav aria-label="Seções" className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(path, item.href) ? "page" : undefined}
          className="flex items-center gap-3 rounded-full px-4 py-2.5 text-[0.95rem] font-medium text-muted transition hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink"
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Folha que sobe do rodapé (celular) ou abre como janela (desktop).
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-panel">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fechar">
            <Icon name="fechar" className="size-4" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function Tab({ item, path }: { item: NavItem; path: string }) {
  return (
    <Link href={item.href} aria-current={isActive(path, item.href) ? "page" : undefined}>
      <span className="tbI">
        <Icon name={item.icon} className="size-[23px]" />
      </span>
      {item.short}
    </Link>
  );
}

// Menu do celular, no estilo do CTD: barra flutuante, "+" central e folha "Mais".
export function MobileNav({ userName, quick }: { userName: string; quick: QuickAdd }) {
  const path = usePathname();
  const [sheet, setSheet] = useState<null | "novo" | "mais">(null);

  // Fecha a folha ao trocar de tela; qualquer botão pode abrir "Novo gasto".
  useEffect(() => setSheet(null), [path]);
  useEffect(() => {
    const open = () => setSheet("novo");
    window.addEventListener(NEW_EXPENSE_EVENT, open);
    return () => window.removeEventListener(NEW_EXPENSE_EVENT, open);
  }, []);

  const moreActive = sheet === "mais" || path === "/mais" || moreItems.some((i) => isActive(path, i.href));

  return (
    <>
      <nav className="tabbar" aria-label="Menu">
        {tabLeft.map((i) => (
          <Tab key={i.href} item={i} path={path} />
        ))}
        <button type="button" className="tbNova" onClick={() => setSheet("novo")} aria-label="Adicionar gasto">
          <span className="tbI">
            <Icon name="novo" />
          </span>
          Novo
        </button>
        {tabRight.map((i) => (
          <Tab key={i.href} item={i} path={path} />
        ))}
        <button type="button" className={moreActive ? "on" : undefined} onClick={() => setSheet(sheet === "mais" ? null : "mais")} aria-haspopup="dialog">
          <span className="tbI">
            <Icon name="mais" className="size-[23px]" />
          </span>
          Mais
        </button>
      </nav>

      {sheet === "novo" && (
        <Sheet title="Novo gasto" onClose={() => setSheet(null)}>
          <ExpenseForm {...quick} onSaved={() => setSheet(null)} autoFocus />
        </Sheet>
      )}

      {sheet === "mais" && (
        <Sheet title="Mais" onClose={() => setSheet(null)}>
          <ul className="flex flex-col gap-1">
            {moreItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(path, item.href) ? "page" : undefined}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base aria-[current=page]:bg-accent aria-[current=page]:text-[color:var(--accent-ink)]"
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <form action={logout} className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="min-w-0 truncate text-sm text-muted">{userName}</span>
            <button className="btn-ghost inline-flex items-center gap-2">
              <Icon name="sair" className="size-4" />
              Sair
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
