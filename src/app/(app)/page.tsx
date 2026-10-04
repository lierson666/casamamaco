import { eq, sql } from "drizzle-orm";
import { Kv } from "@/app/ui/kv";
import { db, schema } from "@/db";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

export default function Painel() {
  const { debts, debtPayments } = schema;

  const rows = db
    .select({
      id: debts.id,
      creditor: debts.creditor,
      owner: debts.owner,
      original: debts.originalCents,
      remaining: sql<number>`${debts.originalCents} - coalesce(sum(${debtPayments.amountCents}), 0)`,
    })
    .from(debts)
    .leftJoin(debtPayments, eq(debtPayments.debtId, debts.id))
    .groupBy(debts.id)
    .all();

  const total = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="flex flex-col gap-6">
      <Kv eyebrow="Casa Mamaco · São Paulo" title="A casa em ordem" accent="sem susto no fim do mês.">
        Contas, caixa, gastos e dívidas num lugar só.
      </Kv>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card min-w-0 p-5 lg:col-span-1">
          <h2 className="text-sm font-medium text-muted">Dívidas em aberto</h2>
          <p className="mt-1 whitespace-nowrap font-display text-[clamp(2rem,3vw,2.3rem)] tabular-nums text-neg">
            {formatBRL(total)}
          </p>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <h2 className="px-5 pt-4 text-sm font-medium text-muted">Por credor</h2>
          <ul className="mt-2 divide-y divide-line">
            {rows.map((r) => {
              const pct = Math.round(((r.original - r.remaining) / r.original) * 100);
              return (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {r.creditor}
                      <span className="ml-2 text-xs font-normal text-muted">{r.owner}</span>
                    </span>
                    <span className="tabular-nums">{formatBRL(r.remaining)}</span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${r.creditor}: ${pct}% pago`}
                  >
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
