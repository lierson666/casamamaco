import { eq, sql } from "drizzle-orm";
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
      remaining: sql<number>`${debts.originalCents} - coalesce(sum(${debtPayments.amountCents}), 0)`,
    })
    .from(debts)
    .leftJoin(debtPayments, eq(debtPayments.debtId, debts.id))
    .groupBy(debts.id)
    .all();

  const total = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-sm font-medium text-zinc-500">Dívidas em aberto</h2>
        <p className="text-3xl font-semibold tabular-nums">{formatBRL(total)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Por credor</h2>
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <span>
                {r.creditor}
                <span className="ml-2 text-xs text-zinc-500">{r.owner}</span>
              </span>
              <span className="tabular-nums">{formatBRL(r.remaining)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
