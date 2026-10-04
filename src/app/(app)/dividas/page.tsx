import { desc, eq } from "drizzle-orm";
import { addDebt, deleteDebt, payDebt, setDebtPlan, undoDebtPayment, updateDebt } from "@/app/actions/dividas";
import { ActionForm } from "@/app/ui/action-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { currentMonth, formatDay, monthLabel, today } from "@/lib/dates";
import { projectPayoff } from "@/lib/debt-plan";
import { centsToInput, formatBRL } from "@/lib/money";
import { accountBalances, debtsWithRemaining } from "@/lib/queries";
import { DEBT_MONTHLY_KEY, getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Dividas() {
  const me = await requireUser();
  const { debtPayments, accounts, users } = schema;
  const list = debtsWithRemaining();
  const open = list.filter((d) => d.remainingCents > 0);
  const totalRemaining = open.reduce((s, d) => s + d.remainingCents, 0);

  const monthly = Number(getSetting(DEBT_MONTHLY_KEY) ?? 0) || 0;
  const plan = projectPayoff(open.map((d) => ({ id: d.id, creditor: d.creditor, remainingCents: d.remainingCents })), monthly, currentMonth());

  const payments = db
    .select({ id: debtPayments.id, debtId: debtPayments.debtId, date: debtPayments.date, cents: debtPayments.amountCents, who: users.name, account: accounts.name })
    .from(debtPayments)
    .leftJoin(users, eq(users.id, debtPayments.paidByUserId))
    .leftJoin(schema.transactions, eq(schema.transactions.id, debtPayments.transactionId))
    .leftJoin(accounts, eq(accounts.id, schema.transactions.accountId))
    .orderBy(desc(debtPayments.date), desc(debtPayments.id))
    .all();

  const accOptions = accountBalances().map((a) => ({ id: a.id, name: a.name }));
  const userOptions = db.select({ id: users.id, name: users.name }).from(users).all();
  const owners = ["casal", ...userOptions.map((u) => u.name)];
  const now = today();

  return (
    <div className="flex flex-col gap-6">
      <datalist id="donos">
        {owners.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <header>
        <p className="eyebrow">Dívidas</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,9vw,3rem)] uppercase leading-none">Quanto falta</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="card col-span-2 p-5 sm:col-span-1">
          <h2 className="text-sm font-medium text-muted">Total em aberto</h2>
          <p className="mt-1 font-display text-[clamp(2.2rem,10vw,3rem)] tabular-nums text-neg">{formatBRL(totalRemaining)}</p>
          <p className="mt-1 text-xs text-muted">{open.length} {open.length === 1 ? "dívida" : "dívidas"} abertas</p>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">Plano por mês</h2>
          <p className="mt-1 font-display text-3xl tabular-nums">{formatBRL(monthly)}</p>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">Tudo quitado em</h2>
          <p className="mt-1 font-display text-2xl uppercase leading-tight">{plan.endMonth ? monthLabel(plan.endMonth) : "—"}</p>
          <p className="mt-1 text-xs text-muted">{monthly > 0 ? (plan.endMonth ? "se mantiver o valor do plano" : "valor baixo demais para quitar") : "defina o valor do plano"}</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-display text-2xl uppercase">Plano de quitação</h2>
        <p className="mb-4 text-sm text-muted">Todo mês o valor fixo vai para a dívida de menor saldo. Quando ela acaba, a sobra e o valor inteiro passam para a próxima (bola de neve).</p>
        <ActionForm action={setDebtPlan} submit="Salvar plano" className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Quanto a casa separa por mês para dívidas (R$)
            <input name="amount" required inputMode="decimal" defaultValue={centsToInput(monthly)} placeholder="0,00" className="field tabular-nums" />
          </label>
        </ActionForm>
        {plan.rows.filter((r) => !r.paid).length > 0 && (
          <ol className="mt-5 divide-y divide-line">
            {plan.rows
              .filter((r) => !r.paid)
              .map((r, i) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="mr-2 text-muted">{i + 1}.</span>
                    {r.creditor}
                  </span>
                  <span className="text-right tabular-nums">
                    {formatBRL(r.remainingCents)}
                    <span className="block text-xs text-muted">{r.payoffMonth ? `quita em ${monthLabel(r.payoffMonth)} (${r.monthsToPay} ${r.monthsToPay === 1 ? "mês" : "meses"})` : "sem previsão"}</span>
                  </span>
                </li>
              ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Dívidas</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {list.map((d) => {
            const pct = Math.min(100, Math.round((d.paidCents / d.originalCents) * 100));
            const mine = payments.filter((p) => p.debtId === d.id);
            return (
              <li key={d.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {d.creditor}
                    <span className="ml-2 text-xs font-normal text-muted">{d.owner}</span>
                  </span>
                  <span className="tabular-nums">{d.remainingCents > 0 ? formatBRL(d.remainingCents) : <span className="text-pos">quitada</span>}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Total {formatBRL(d.originalCents)} · pago {formatBRL(d.paidCents)} ({pct}%)
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.creditor}: ${pct}% pago`}>
                  <div className="h-full bg-pos" style={{ width: `${pct}%` }} />
                </div>
                {d.notes && <p className="mt-1 text-xs text-muted">{d.notes}</p>}

                <div className="mt-2 flex flex-wrap items-start gap-2">
                  {d.remainingCents > 0 && (
                    <details className="w-full sm:w-auto">
                      <summary className="btn-ghost inline-block cursor-pointer list-none text-sm">Registrar pagamento</summary>
                      <div className="card mt-2 p-4">
                        <ActionForm action={payDebt} submit="Registrar pagamento">
                          <input type="hidden" name="debtId" value={d.id} />
                          <label className="flex flex-col gap-1.5 text-sm font-medium">
                            Valor pago (R$)
                            <input name="amount" required inputMode="decimal" placeholder="0,00" className="field tabular-nums" />
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm font-medium">
                            Data
                            <input name="date" type="date" required defaultValue={now} className="field" />
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm font-medium">
                            Saiu de qual conta?
                            <select name="accountId" required defaultValue="" className="field">
                              <option value="" disabled>
                                Escolha…
                              </option>
                              {accOptions.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-sm font-medium">
                            Quem pagou?
                            <select name="paidBy" required defaultValue={me.id} className="field">
                              {userOptions.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </ActionForm>
                      </div>
                    </details>
                  )}
                  <details className="w-full sm:w-auto">
                    <summary className="btn-ghost inline-block cursor-pointer list-none text-sm">Editar</summary>
                    <div className="card mt-2 p-4">
                      <ActionForm action={updateDebt} submit="Salvar">
                        <input type="hidden" name="debtId" value={d.id} />
                        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                          Credor
                          <input name="creditor" required maxLength={100} defaultValue={d.creditor} className="field" />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                          Valor da dívida (R$)
                          <input name="amount" required inputMode="decimal" defaultValue={centsToInput(d.originalCents)} className="field tabular-nums" />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium">
                          De quem é
                          <input name="owner" required maxLength={40} defaultValue={d.owner} list="donos" className="field" />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                          Observação
                          <input name="notes" maxLength={300} defaultValue={d.notes ?? ""} className="field" />
                        </label>
                      </ActionForm>
                      {mine.length === 0 && (
                        <form action={deleteDebt} className="mt-3">
                          <input type="hidden" name="id" value={d.id} />
                          <button className="text-xs text-muted underline hover:text-neg">Remover esta dívida</button>
                        </form>
                      )}
                    </div>
                  </details>
                  {mine.length > 0 && (
                    <details className="w-full sm:w-auto">
                      <summary className="btn-ghost inline-block cursor-pointer list-none text-sm">Pagamentos ({mine.length})</summary>
                      <ul className="card mt-2 divide-y divide-line overflow-hidden">
                        {mine.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span>
                              {formatDay(p.date)} · {formatBRL(p.cents)}
                              <span className="block text-xs text-muted">
                                {p.who ?? "—"}
                                {p.account ? ` · ${p.account}` : " · histórico anterior ao sistema"}
                              </span>
                            </span>
                            <form action={undoDebtPayment}>
                              <input type="hidden" name="id" value={p.id} />
                              <button className="text-xs text-muted underline hover:text-neg" aria-label={`Desfazer pagamento de ${formatBRL(p.cents)}`}>
                                Desfazer
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-2xl uppercase">Nova dívida</h2>
        <ActionForm action={addDebt} submit="Cadastrar dívida">
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Credor
            <input name="creditor" required maxLength={100} placeholder="Ex.: Ipanema (Santander)" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Valor atual da dívida (R$)
            <input name="amount" required inputMode="decimal" placeholder="0,00" className="field tabular-nums" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            De quem é
            <select name="owner" defaultValue="casal" className="field">
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Observação (opcional)
            <input name="notes" maxLength={300} placeholder="Ex.: acordo em 9x de R$ 199,43" className="field" />
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
