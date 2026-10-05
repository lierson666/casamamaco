import Link from "next/link";
import { eq } from "drizzle-orm";
import { BarsChart, DonutChart } from "@/app/ui/charts";
import { Kv } from "@/app/ui/kv";
import { NewExpenseButton } from "@/app/ui/new-expense-button";
import { Stamp } from "@/app/ui/stamp";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ensureMonthBills } from "@/lib/bills";
import { budgetStatus } from "@/lib/budget";
import { forecastBalance } from "@/lib/caixa";
import { addDays, currentMonth, formatDay, monthLabel, today } from "@/lib/dates";
import { projectPayoff } from "@/lib/debt-plan";
import { formatBRL, formatCompact } from "@/lib/money";
import { lastMonths, seriesByMonth, shares } from "@/lib/report";
import { accountBalances, debtsWithRemaining, dueByDate, expenseCategories, monthlyTotals, spentByCategory, spentByCategoryName, unpaidBillsUpTo } from "@/lib/queries";
import { DEBT_MONTHLY_KEY, getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const daysBetween = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Seção sem caixa: título com régua de caderno e um atalho discreto.
function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="rule-head mb-1">
        <h2 className="h3">{title}</h2>
        <Link href={href} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
          ver tudo
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function Painel() {
  const user = await requireUser();
  const now = today();
  const month = currentMonth();
  ensureMonthBills(month);

  // Contas atrasadas e vencendo em 7 dias
  const due = dueByDate(addDays(now, 7));

  // Saldo atual e previsto (inclui as atrasadas de meses anteriores)
  const cash = accountBalances().filter((a) => a.type !== "cartao");
  const total = cash.reduce((s, a) => s + a.balanceCents, 0);
  const open = unpaidBillsUpTo(month);
  const openSum = open.reduce((s, b) => s + (b.amountCents ?? 0), 0);
  const noValue = open.filter((b) => b.amountCents == null).length;
  const forecast = forecastBalance(total, openSum);

  // Gasto do mês x orçamento
  const spent = spentByCategory(month);
  const limits = new Map(db.select().from(schema.budgets).where(eq(schema.budgets.month, month)).all().map((b) => [b.categoryId, b.limitCents]));
  const spentTotal = [...spent.values()].reduce((a, b) => a + b, 0);
  const cats = expenseCategories();
  const limitTotal = cats.reduce((a, c) => a + (limits.get(c.id) ?? 0), 0);
  const spentUnder = cats.filter((c) => (limits.get(c.id) ?? 0) > 0).reduce((a, c) => a + (spent.get(c.id) ?? 0), 0);
  const overall = budgetStatus(limitTotal, spentUnder);
  const alerts = cats
    .map((c) => ({ name: c.name, s: budgetStatus(limits.get(c.id), spent.get(c.id) ?? 0) }))
    .filter((r) => r.s.level === "warn" || r.s.level === "over");

  // Gráficos
  const slices = shares(spentByCategoryName(month), 5);
  const months = lastMonths(month, 6);
  const series = seriesByMonth(monthlyTotals(months), months);

  // Dívidas e plano
  const openDebts = debtsWithRemaining().filter((d) => d.remainingCents > 0);
  const debtTotal = openDebts.reduce((s, d) => s + d.remainingCents, 0);
  const monthly = Number(getSetting(DEBT_MONTHLY_KEY) ?? 0) || 0;
  const plan = projectPayoff(openDebts.map((d) => ({ id: d.id, creditor: d.creditor, remainingCents: d.remainingCents })), monthly, month);
  const next = plan.rows.find((r) => !r.paid);

  const firstName = user.name.split(" ")[0];
  const empty = total === 0 && openSum === 0 && spentTotal === 0;
  const lead = empty
    ? "Comece dizendo quanto há em cada conta: em Caixa, ajuste o saldo inicial."
    : forecast >= 0
      ? `Depois de pagar as contas abertas, sobram ${formatBRL(forecast)}.`
      : `Faltam ${formatBRL(-forecast)} para pagar as contas abertas.`;

  return (
    <div className="flex flex-col gap-8">
      <Kv title={`Olá, ${firstName}`} lead={lead}>
        <p className="label">Saldo previsto de {monthLabel(month)}</p>
        <p className={`hero total-rule mt-1 ${forecast < 0 ? "text-neg" : ""}`}>{formatBRL(forecast)}</p>
        <p className="mt-2 text-sm text-muted">
          Há {formatBRL(total)} no caixa e {formatBRL(openSum)} em contas abertas e atrasadas
          {noValue > 0 && ` (mais ${plural(noValue, "conta sem valor definido", "contas sem valor definido")})`}.
        </p>
      </Kv>

      <NewExpenseButton className="w-full sm:w-auto sm:self-start" />

      <Section title="Para pagar" href="/contas">
        {due.length === 0 ? (
          <p className="py-3 text-pos">Nada atrasado nem vencendo nos próximos 7 dias.</p>
        ) : (
          <ul>
            {due.map((b) => {
              const late = b.dueDate! < now;
              const d = daysBetween(b.dueDate!, now);
              return (
                <li key={b.id} className="border-b border-line py-2.5 last:border-b-0">
                  <div className="leader">
                    <span className="font-medium">{b.name}</span>
                    <span className="leader-dots" aria-hidden />
                    {b.amountCents != null ? <span className="num font-medium">{formatBRL(b.amountCents)}</span> : <span className="text-sm text-accent">valor a definir</span>}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                    {late ? (
                      <>
                        <Stamp tone="atraso">atrasada</Stamp> venceu em {formatDay(b.dueDate!)} ({plural(-d, "dia", "dias")})
                      </>
                    ) : d === 0 ? (
                      <Stamp tone="hoje">vence hoje</Stamp>
                    ) : (
                      <>
                        vence em {formatDay(b.dueDate!)} ({plural(d, "dia", "dias")})
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Orçamento do mês" href="/orcamento">
          <p className="mt-2">
            <span className="h2 num">{formatBRL(spentTotal)}</span> <span className="text-muted">gastos em {monthLabel(month)}</span>
          </p>
          {limitTotal > 0 ? (
            <>
              <div className="mt-3 h-2 overflow-hidden border border-edge bg-surface-2" role="progressbar" aria-valuenow={Math.min(overall.pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Orçamento do mês">
                <div className={`h-full ${overall.level === "over" ? "bg-neg" : overall.level === "warn" ? "bg-accent" : "bg-pos"}`} style={{ width: `${Math.min(overall.pct, 100)}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-muted">
                {overall.pct}% dos tetos ({formatBRL(spentUnder)} de {formatBRL(limitTotal)})
              </p>
              {alerts.length > 0 && (
                <ul className="mt-2 text-sm">
                  {alerts.map((a) => (
                    <li key={a.name} className={a.s.level === "over" ? "text-neg" : ""}>
                      {a.name}: {a.s.level === "over" ? "estourou" : "perto do teto"} ({a.s.pct}%)
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Sem tetos ainda. Defina por categoria em Orçamento.</p>
          )}
        </Section>

        <Section title="Dívidas" href="/dividas">
          <p className="mt-2">
            <span className="h2 num text-neg">{formatBRL(debtTotal)}</span> <span className="text-muted">em {plural(openDebts.length, "dívida aberta", "dívidas abertas")}</span>
          </p>
          {monthly > 0 ? (
            <p className="mt-2 text-sm">
              {formatBRL(monthly)} por mês
              {plan.endMonth ? (
                <>
                  , tudo quitado em <b>{monthLabel(plan.endMonth)}</b>
                </>
              ) : (
                ", valor baixo demais para quitar"
              )}
              .
              {next?.payoffMonth && (
                <span className="block text-muted">
                  A próxima a acabar é {next.creditor} ({monthLabel(next.payoffMonth)}).
                </span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">Defina quanto separar por mês em Dívidas para ver quando cada uma acaba.</p>
          )}
        </Section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Para onde foi o dinheiro" href="/relatorio">
          <div className="pt-4">
            <DonutChart slices={slices} centerTop={formatCompact(spentTotal)} centerBottom="gasto no mês" />
          </div>
        </Section>
        <Section title="Entradas e saídas, 6 meses" href="/relatorio">
          <div className="pt-4">
            <BarsChart data={series} />
          </div>
        </Section>
      </div>
    </div>
  );
}
