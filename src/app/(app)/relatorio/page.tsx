import { BarsChart, DonutChart } from "@/app/ui/charts";
import { MonthNav } from "@/app/ui/month-nav";
import { requireUser } from "@/lib/auth";
import { currentMonth, formatDay, isMonth, monthLabel, shiftMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { delta, lastMonths, seriesByMonth, shares, topChanges } from "@/lib/report";
import { monthlyTotals, spentByAccount, spentByCategoryName, spentByPerson, topExpenses } from "@/lib/queries";

export const dynamic = "force-dynamic";

const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const pctText = (pct: number | null) => (pct === null ? "novo" : `${pct > 0 ? "+" : ""}${pct}%`);

function Kpi({ title, value, note, tone }: { title: string; value: string; note?: React.ReactNode; tone?: string }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      <p className={`mt-1 font-display text-[clamp(1.7rem,6vw,2.3rem)] tabular-nums ${tone ?? ""}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { name: string; cents: number }[] }) {
  const list = [...rows].filter((r) => r.cents > 0).sort((a, b) => b.cents - a.cents);
  const total = list.reduce((s, r) => s + r.cents, 0);
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted">Nada neste mês.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <li key={r.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="tabular-nums">{formatBRL(r.cents)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${Math.round((r.cents / total) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Relatorio({ searchParams }: PageProps<"/relatorio">) {
  await requireUser();
  const { mes } = await searchParams;
  const month = isMonth(typeof mes === "string" ? mes : undefined) ? (mes as string) : currentMonth();
  const prev = shiftMonth(month, -1);

  const months = lastMonths(month, 6);
  const series = seriesByMonth(monthlyTotals(months), months);
  const cur = series[series.length - 1];
  const before = series[series.length - 2];
  const result = cur.entradas - cur.saidas;
  const dSaidas = delta(cur.saidas, before.saidas);

  const cats = spentByCategoryName(month);
  const catsPrev = spentByCategoryName(prev);
  const slices = shares(cats, 6);
  const changes = topChanges(new Map(cats.map((c) => [c.name, c.cents])), new Map(catsPrev.map((c) => [c.name, c.cents])), 3);
  const top = topExpenses(month, 5);
  const noData = cur.saidas === 0 && cur.entradas === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Relatório</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,9vw,3rem)] uppercase leading-none">{monthLabel(month)}</h1>
        </div>
        <MonthNav base="/relatorio" month={month} />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Kpi title="Entrou" value={formatBRL(cur.entradas)} tone="text-pos" />
        <Kpi
          title="Saiu"
          value={formatBRL(cur.saidas)}
          note={before.saidas > 0 || cur.saidas > 0 ? `${sign(dSaidas.diff)} ${formatBRL(Math.abs(dSaidas.diff))} (${pctText(dSaidas.pct)}) contra ${monthLabel(prev)}` : undefined}
        />
        <div className="col-span-2 sm:col-span-1">
          <Kpi title="Resultado do mês" value={`${sign(result)} ${formatBRL(Math.abs(result))}`} tone={result < 0 ? "text-neg" : "text-pos"} note={result < 0 ? "Saiu mais do que entrou" : result > 0 ? "Sobrou dinheiro" : undefined} />
        </div>
      </section>

      {noData ? (
        <p className="card p-5 text-sm text-muted">Ainda não há lançamentos em {monthLabel(month)}. Registre entradas no Caixa e gastos pelo “+”, e os gráficos aparecem aqui.</p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-4 text-sm font-medium text-muted">Para onde foi o dinheiro</h2>
              <DonutChart slices={slices} centerTop={formatBRL(cur.saidas)} centerBottom="gasto no mês" />
            </section>
            <section className="card p-5">
              <h2 className="mb-4 text-sm font-medium text-muted">Entradas e saídas, últimos 6 meses</h2>
              <BarsChart data={series} />
            </section>
          </div>

          {changes.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted">O que mudou em relação a {monthLabel(prev)}</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {changes.map((c) => (
                  <li key={c.name} className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{c.name}</span>
                    <span className={`tabular-nums ${c.diff > 0 ? "text-neg" : "text-pos"}`}>
                      {sign(c.diff)} {formatBRL(Math.abs(c.diff))} <span className="text-muted">({pctText(c.pct)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Breakdown title="Quem pagou" rows={spentByPerson(month)} />
            <Breakdown title="De qual conta saiu" rows={spentByAccount(month)} />
          </div>

          {top.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted">Maiores gastos do mês</h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {top.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      {e.description}
                      <span className="block text-xs text-muted">{formatDay(e.date)}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatBRL(e.cents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
