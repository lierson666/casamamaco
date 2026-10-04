import Link from "next/link";
import { currentMonth, shiftMonth } from "@/lib/dates";

// Navegação "← Anterior / Este mês / Próximo →" por mês, para a rota informada.
export function MonthNav({ base, month }: { base: string; month: string }) {
  return (
    <nav aria-label="Mês" className="flex items-center gap-2 text-sm">
      <Link href={`${base}?mes=${shiftMonth(month, -1)}`} className="btn-ghost">
        ← Anterior
      </Link>
      {month !== currentMonth() && (
        <Link href={base} className="btn-ghost">
          Este mês
        </Link>
      )}
      <Link href={`${base}?mes=${shiftMonth(month, 1)}`} className="btn-ghost">
        Próximo →
      </Link>
    </nav>
  );
}
