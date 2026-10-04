import { and, desc, eq, gte, lt } from "drizzle-orm";
import { addIncome, setOpeningBalance } from "@/app/actions/caixa";
import { ActionForm } from "@/app/ui/action-form";
import { MonthNav } from "@/app/ui/month-nav";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { forecastBalance } from "@/lib/caixa";
import { currentMonth, formatDay, isMonth, monthLabel, today } from "@/lib/dates";
import { centsToInput, formatBRL } from "@/lib/money";
import { accountBalances, monthRange, unpaidBillsUpTo } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Caixa({ searchParams }: PageProps<"/caixa">) {
  const me = await requireUser();
  const { mes } = await searchParams;
  const month = isMonth(typeof mes === "string" ? mes : undefined) ? (mes as string) : currentMonth();
  const { from, to } = monthRange(month);
  const { transactions: t, accounts, categories, users } = schema;

  const balances = accountBalances();
  const cash = balances.filter((a) => a.type !== "cartao");
  const total = cash.reduce((s, a) => s + a.balanceCents, 0);
  const open = unpaidBillsUpTo(currentMonth()); // inclui as atrasadas de meses anteriores
  const openSum = open.reduce((s, b) => s + (b.amountCents ?? 0), 0);
  const noValue = open.filter((b) => b.amountCents == null).length;
  const forecast = forecastBalance(total, openSum);

  const rows = db
    .select({ id: t.id, date: t.date, type: t.type, accountType: accounts.type, cents: t.amountCents, description: t.description, account: accounts.name, category: categories.name, who: users.name })
    .from(t)
    .innerJoin(accounts, eq(accounts.id, t.accountId))
    .leftJoin(categories, eq(categories.id, t.categoryId))
    .leftJoin(users, eq(users.id, t.userId))
    .where(and(gte(t.date, from), lt(t.date, to)))
    .orderBy(desc(t.date), desc(t.id))
    .all();
  const cardMonth = new Map<string, number>();
  for (const r of rows) if (r.type === "saida" && r.accountType === "cartao") cardMonth.set(r.account, (cardMonth.get(r.account) ?? 0) + r.cents);
  const entradas = rows.filter((r) => r.type === "entrada").reduce((s, r) => s + r.cents, 0);
  const saidas = rows.filter((r) => r.type === "saida").reduce((s, r) => s + r.cents, 0);

  const incomeCats = db.select().from(categories).where(and(eq(categories.kind, "receita"), eq(categories.archived, false))).all();
  const userOptions = db.select({ id: users.id, name: users.name }).from(users).all();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Caixa da casa</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,9vw,3rem)] uppercase leading-none">{monthLabel(month)}</h1>
        </div>
        <MonthNav base="/caixa" month={month} />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="card col-span-2 p-5 sm:col-span-1">
          <h2 className="text-sm font-medium text-muted">Saldo atual</h2>
          <p className={`mt-1 font-display text-[clamp(2.2rem,10vw,3rem)] tabular-nums ${total < 0 ? "text-neg" : ""}`}>{formatBRL(total)}</p>
          <p className="mt-1 text-xs text-muted">Carteira e contas do banco</p>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">Saldo previsto</h2>
          <p className={`mt-1 font-display text-3xl tabular-nums ${forecast < 0 ? "text-neg" : "text-pos"}`}>{formatBRL(forecast)}</p>
          <p className="mt-1 text-xs text-muted">
            Depois de {formatBRL(openSum)} em contas abertas e atrasadas{noValue > 0 && ` (+${noValue} sem valor definido)`}
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">No mês</h2>
          <p className="mt-1 text-sm tabular-nums text-pos">+ {formatBRL(entradas)}</p>
          <p className="text-sm tabular-nums text-neg">− {formatBRL(saidas)}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Contas</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {balances.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {a.name}
                  <span className="ml-2 text-xs font-normal text-muted">{a.type === "cartao" ? "cartão" : a.type === "banco" ? "banco" : "dinheiro"}</span>
                </span>
                {a.type === "cartao" ? (
                  <span className="text-sm tabular-nums">{formatBRL(cardMonth.get(a.name) ?? 0)} gastos em {monthLabel(month)}</span>
                ) : (
                  <span className={`tabular-nums ${a.balanceCents < 0 ? "text-neg" : ""}`}>{formatBRL(a.balanceCents)}</span>
                )}
              </div>
              {a.type !== "cartao" && (
                <details className="mt-2">
                  <summary className="btn-ghost inline-block cursor-pointer list-none text-sm">Ajustar saldo inicial ({formatBRL(a.openingCents)})</summary>
                  <div className="card mt-2 p-4">
                    <p className="mb-3 text-sm text-muted">Quanto havia nesta conta antes do primeiro lançamento no sistema. Pode ser zero ou negativo.</p>
                    <ActionForm action={setOpeningBalance} submit="Salvar saldo inicial" className="flex flex-col gap-3">
                      <input type="hidden" name="accountId" value={a.id} />
                      <input name="amount" required inputMode="decimal" defaultValue={centsToInput(a.openingCents)} placeholder="0,00" className="field tabular-nums" />
                    </ActionForm>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-2xl uppercase">Registrar entrada</h2>
        <ActionForm action={addIncome} submit="Registrar entrada">
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            O que entrou?
            <input name="description" required maxLength={120} placeholder="Ex.: Retirada de outubro, serviço extra" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Valor (R$)
            <input name="amount" required inputMode="decimal" placeholder="0,00" className="field tabular-nums" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Data
            <input name="date" type="date" required defaultValue={today()} className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Origem
            <select name="categoryId" required defaultValue="" className="field">
              <option value="" disabled>
                Escolha…
              </option>
              {incomeCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Entrou em qual conta?
            <select name="accountId" required defaultValue="" className="field">
              <option value="" disabled>
                Escolha…
              </option>
              {cash.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Quem recebeu?
            <select name="receivedBy" required defaultValue={me.id} className="field">
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Movimentos do mês</h2>
        {rows.length === 0 ? (
          <p className="card p-5 text-sm text-muted">Nenhum movimento neste mês.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.description}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDay(r.date)} · {r.category ?? "Sem categoria"} · {r.account} · {r.who ?? "—"}
                  </p>
                </div>
                <span className={`shrink-0 tabular-nums ${r.type === "entrada" ? "text-pos" : ""}`}>
                  {r.type === "entrada" ? "+ " : "− "}
                  {formatBRL(r.cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
