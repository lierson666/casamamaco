"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomItems, moreItems, navItems, type NavItem } from "@/lib/nav-items";
import { Icon } from "./icons";

const moreHrefs = moreItems.map((i) => i.href);

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

export function BottomNav() {
  const path = usePathname();
  const moreActive = path === "/mais" || moreHrefs.some((h) => isActive(path, h));
  const items: NavItem[] = [...bottomItems, { href: "/mais", label: "Mais", icon: "mais" }];
  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/mais" ? moreActive : isActive(path, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium text-muted aria-[current=page]:text-accent"
              >
                <Icon name={item.icon} />
                {item.label.split(" ")[0]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
