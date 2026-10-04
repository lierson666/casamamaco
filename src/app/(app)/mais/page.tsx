import Link from "next/link";
import { Icon } from "@/app/ui/icons";
import { moreItems } from "@/lib/nav-items";

export default function Mais() {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {moreItems.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="flex items-center gap-3 px-4 py-4">
            <Icon name={item.icon} />
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
