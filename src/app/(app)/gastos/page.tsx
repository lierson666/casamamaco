import { and, desc, eq, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { deleteExpense } from "@/app/actions/gastos";
import { ExpenseForm } from "@/app/ui/expense-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { currentMonth, formatDay, isMonth, monthLabel, shiftMonth, today } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

type Row = { name: string; cents: number };

function groupSum(items: { key: string; cents: number }[]): Row[] {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.key, (map.get(i.key) ?? 0) + i.cents);
  return [...map].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

function Breakdown({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nada neste mês.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="tabular-nums">{formatBRL(r.cents)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${total ? Math.round((r.cents / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Gastos({ searchParams }: PageProps<"/gastos">) {
  const me = await requireUser();
  const { mes } = await searchParams;
  const month = isMonth(typeof mes === "string" ? mes : undefined) ? (mes as string) : currentMonth();
  const next = shiftMonth(month, 1);
  const { transactions: t, accounts, categories, users } = schema;

  const rows = db
    .select({
      id: t.id,
      date: t.date,
      description: t.description,
      cents: t.amountCents,
      account: accounts.name,
      category: categories.name,
      payer: users.name,
    })
    .from(t)
    .innerJoin(accounts, eq(accounts.id, t.accountId))
    .leftJoin(categories, eq(categories.id, t.categoryId))
    .leftJoin(users, eq(users.id, t.userId))
    .where(and(eq(t.type, "saida"), gte(t.date, `${month}-01`), lt(t.date, `${next}-01`)))
    .orderBy(desc(t.date), desc(t.id))
    .all();

  const total = rows.reduce((s, r) => s + r.cents, 0);
  const byPerson = groupSum(rows.map((r) => ({ key: r.payer ?? "—", cents: r.cents })));
  const byAccount = groupSum(rows.map((r) => ({ key: r.account, cents: r.cents })));
  const byCategory = groupSum(rows.map((r) => ({ key: r.category ?? "Sem categoria", cents: r.cents })));

  const catOptions = db.select().from(categories).where(and(eq(categories.kind, "despesa"), eq(categories.archived, false))).all();
  const accOptions = db.select().from(accounts).where(eq(accounts.archived, false)).all();
  const userOptions = db.select({ id: users.id, name: users.name }).from(users).all();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Gastos do mês</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none">{monthLabel(month)}</h1>
        </div>
        <nav aria-label="Mês" className="flex items-center gap-2 text-sm">
          <Link href={`/gastos?mes=${shiftMonth(month, -1)}`} className="btn-ghost">
            ← Anterior
          </Link>
          {month !== currentMonth() && (
            <Link href="/gastos" className="btn-ghost">
              Este mês
            </Link>
          )}
          <Link href={`/gastos?mes=${next}`} className="btn-ghost">
            Próximo →
          </Link>
        </nav>
      </header>

      <section className="card p-5">
        <h2 className="text-sm font-medium text-muted">Total gasto no mês</h2>
        <p className="mt-1 font-display text-5xl tabular-nums text-neg">{formatBRL(total)}</p>
        <p className="mt-1 text-sm text-muted">
          {rows.length} {rows.length === 1 ? "lançamento" : "lançamentos"}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Breakdown title="Quem pagou" rows={byPerson} total={total} />
        <Breakdown title="De qual conta saiu" rows={byAccount} total={total} />
        <Breakdown title="Em quê" rows={byCategory} total={total} />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-2xl uppercase">Novo gasto</h2>
        <ExpenseForm categories={catOptions} accounts={accOptions} users={userOptions} me={me.id} today={today()} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Lançamentos</h2>
        {rows.length === 0 ? (
          <p className="card p-5 text-sm text-muted">Nenhum gasto registrado neste mês.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.description}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDay(r.date)} · {r.category ?? "Sem categoria"} · {r.account} · pago por{" "}
                    <span className="text-ink">{r.payer ?? "—"}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular-nums">{formatBRL(r.cents)}</span>
                  <form action={deleteExpense}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-muted underline hover:text-neg" aria-label={`Excluir ${r.description}`}>
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
