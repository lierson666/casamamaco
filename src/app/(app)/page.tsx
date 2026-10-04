import Link from "next/link";
import { eq } from "drizzle-orm";
import { Kv } from "@/app/ui/kv";
import { NewExpenseButton } from "@/app/ui/new-expense-button";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ensureMonthBills } from "@/lib/bills";
import { budgetStatus } from "@/lib/budget";
import { forecastBalance } from "@/lib/caixa";
import { addDays, currentMonth, formatDay, monthLabel, today } from "@/lib/dates";
import { projectPayoff } from "@/lib/debt-plan";
import { formatBRL } from "@/lib/money";
import { accountBalances, debtsWithRemaining, dueByDate, expenseCategories, spentByCategory, unpaidBillsUpTo } from "@/lib/queries";
import { DEBT_MONTHLY_KEY, getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const daysBetween = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

function Card({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        <Link href={href} className="text-xs underline">
          ver tudo
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function Painel() {
  await requireUser();
  const now = today();
  const month = currentMonth();
  ensureMonthBills(month);

  // 1) Contas atrasadas e vencendo em 7 dias
  const due = dueByDate(addDays(now, 7));
  const overdue = due.filter((b) => b.dueDate! < now);

  // 2) Saldo atual e previsto
  const cash = accountBalances().filter((a) => a.type !== "cartao");
  const total = cash.reduce((s, a) => s + a.balanceCents, 0);
  const open = unpaidBillsUpTo(month); // abertas do mês + atrasadas de meses anteriores
  const openSum = open.reduce((s, b) => s + (b.amountCents ?? 0), 0);
  const noValue = open.filter((b) => b.amountCents == null).length;
  const forecast = forecastBalance(total, openSum);

  // 3) Gasto do mês x orçamento
  const spent = spentByCategory(month);
  const limits = new Map(db.select().from(schema.budgets).where(eq(schema.budgets.month, month)).all().map((b) => [b.categoryId, b.limitCents]));
  const spentTotal = [...spent.values()].reduce((a, b) => a + b, 0);
  const cats = expenseCategories();
  const limitTotal = cats.reduce((a, c) => a + (limits.get(c.id) ?? 0), 0);
  const spentUnder = cats.filter((c) => (limits.get(c.id) ?? 0) > 0).reduce((a, c) => a + (spent.get(c.id) ?? 0), 0);
  const overall = budgetStatus(limitTotal, spentUnder);
  const alerts = cats
    .map((c) => ({ name: c.name, s: budgetStatus(limits.get(c.id), spent.get(c.id) ?? 0), spent: spent.get(c.id) ?? 0, limit: limits.get(c.id) ?? 0 }))
    .filter((r) => r.s.level === "warn" || r.s.level === "over");

  // 4) Dívidas e plano
  const debts = debtsWithRemaining();
  const openDebts = debts.filter((d) => d.remainingCents > 0);
  const debtTotal = openDebts.reduce((s, d) => s + d.remainingCents, 0);
  const monthly = Number(getSetting(DEBT_MONTHLY_KEY) ?? 0) || 0;
  const plan = projectPayoff(openDebts.map((d) => ({ id: d.id, creditor: d.creditor, remainingCents: d.remainingCents })), monthly, month);
  const next = plan.rows.find((r) => !r.paid);

  return (
    <div className="flex flex-col gap-6">
      <Kv eyebrow="Casa Mamaco · São Paulo" title="A casa em ordem" accent="sem susto no fim do mês.">
        Contas, caixa, gastos e dívidas num lugar só.
      </Kv>

      <NewExpenseButton className="w-full sm:w-auto sm:self-start" />

      <Card title="Contas atrasadas e vencendo" href="/contas">
        {due.length === 0 ? (
          <p className="text-sm text-pos">Nada atrasado nem vencendo nos próximos 7 dias.</p>
        ) : (
          <>
            {overdue.length > 0 && (
              <p className="mb-2 text-sm font-semibold text-neg">
                {overdue.length} {overdue.length === 1 ? "conta atrasada" : "contas atrasadas"}
              </p>
            )}
            <ul className="divide-y divide-line">
              {due.map((b) => {
                const late = b.dueDate! < now;
                const d = daysBetween(b.dueDate!, now);
                return (
                  <li key={b.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span>
                      {b.name}
                      <span className={`block text-xs ${late ? "font-semibold text-neg" : "text-muted"}`}>
                        {late ? `venceu em ${formatDay(b.dueDate!)} (${-d} ${-d === 1 ? "dia" : "dias"} de atraso)` : d === 0 ? "vence hoje" : `vence em ${formatDay(b.dueDate!)} (${d} ${d === 1 ? "dia" : "dias"})`}
                      </span>
                    </span>
                    {b.amountCents != null ? <span className="tabular-nums">{formatBRL(b.amountCents)}</span> : <span className="text-xs font-semibold text-accent">valor a definir</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Saldo atual e previsto" href="/caixa">
          <p className={`font-display text-[clamp(2rem,9vw,2.6rem)] tabular-nums ${total < 0 ? "text-neg" : ""}`}>{formatBRL(total)}</p>
          <p className={`mt-1 text-sm tabular-nums ${forecast < 0 ? "text-neg" : "text-pos"}`}>
            Previsto: {formatBRL(forecast)}
            <span className="block text-xs text-muted">depois de {formatBRL(openSum)} em contas abertas e atrasadas{noValue > 0 && ` (+${noValue} sem valor definido)`}</span>
          </p>
        </Card>

        <Card title="Gasto do mês x orçamento" href="/orcamento">
          <p className="font-display text-[clamp(2rem,9vw,2.6rem)] tabular-nums">{formatBRL(spentTotal)}</p>
          {limitTotal > 0 ? (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.min(overall.pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Orçamento do mês">
                <div className={`h-full ${overall.level === "over" ? "bg-neg" : overall.level === "warn" ? "bg-accent" : "bg-pos"}`} style={{ width: `${Math.min(overall.pct, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {overall.pct}% dos tetos ({formatBRL(spentUnder)} de {formatBRL(limitTotal)})
              </p>
              {alerts.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {alerts.map((a) => (
                    <li key={a.name} className={a.s.level === "over" ? "text-neg" : "text-accent"}>
                      {a.name}: {a.s.level === "over" ? "estourou" : "perto do teto"} ({a.s.pct}%)
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-1 text-xs text-muted">Sem tetos definidos. Defina em Orçamento.</p>
          )}
        </Card>
      </div>

      <Card title="Dívidas e plano de quitação" href="/dividas">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-display text-[clamp(2rem,9vw,2.6rem)] tabular-nums text-neg">{formatBRL(debtTotal)}</p>
          <p className="text-sm text-muted">{openDebts.length} {openDebts.length === 1 ? "dívida aberta" : "dívidas abertas"}</p>
        </div>
        {monthly > 0 ? (
          <p className="mt-1 text-sm">
            {formatBRL(monthly)} por mês
            {plan.endMonth ? <> · tudo quitado em <b>{monthLabel(plan.endMonth)}</b></> : " · valor baixo demais para quitar"}
            {next?.payoffMonth && (
              <span className="block text-xs text-muted">
                próxima a acabar: {next.creditor} ({monthLabel(next.payoffMonth)})
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">Defina quanto separar por mês para ver a previsão de quitação.</p>
        )}
      </Card>
    </div>
  );
}
