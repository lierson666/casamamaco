import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { addBill, deleteBill, payBill, unpayBill, updateBill } from "@/app/actions/contas";
import { ActionForm } from "@/app/ui/action-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ensureMonthBills } from "@/lib/bills";
import { currentMonth, formatDay, isMonth, monthLabel, shiftMonth, today } from "@/lib/dates";
import { centsToInput, formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

type Option = { id: number; name: string };
type BillRow = {
  id: number;
  name: string;
  dueDate: string | null;
  amount: number | null;
  paidAt: string | null;
  payer: string | null;
  account: string | null;
  notes: string | null;
  templateId: number | null;
};

const daysFrom = (iso: string, base: string) =>
  Math.round((Date.parse(iso) - Date.parse(base)) / 86_400_000);

function Bill({ b, accounts, users, me, now }: { b: BillRow; accounts: Option[]; users: Option[]; me: number; now: string }) {
  const overdue = !b.paidAt && b.dueDate && b.dueDate < now;
  const left = b.dueDate && !b.paidAt ? daysFrom(b.dueDate, now) : null;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{b.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {b.paidAt ? (
              <>
                Paga em {formatDay(b.paidAt)} · {b.account ?? "—"} · por <span className="text-ink">{b.payer ?? "—"}</span>
              </>
            ) : b.dueDate ? (
              <span className={overdue ? "font-semibold text-neg" : undefined}>
                {overdue
                  ? `Venceu em ${formatDay(b.dueDate)} (${-left!} ${-left! === 1 ? "dia" : "dias"} de atraso)`
                  : left === 0
                    ? "Vence hoje"
                    : `Vence em ${formatDay(b.dueDate)} (${left} ${left === 1 ? "dia" : "dias"})`}
              </span>
            ) : (
              "Sem data de vencimento"
            )}
          </p>
          {b.notes && !b.paidAt && <p className="mt-1 text-xs text-muted">{b.notes}</p>}
        </div>
        <div className="shrink-0 text-right">
          {b.amount != null ? (
            <span className="tabular-nums">{formatBRL(b.amount)}</span>
          ) : (
            <span className="text-xs font-semibold text-accent">valor a definir</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-start gap-2 text-sm">
        {b.paidAt ? (
          <form action={unpayBill}>
            <input type="hidden" name="id" value={b.id} />
            <button className="btn-ghost">Desfazer pagamento</button>
          </form>
        ) : (
          <>
            <details className="w-full sm:w-auto">
              <summary className="btn-ghost inline-block cursor-pointer list-none">Pagar</summary>
              <div className="card mt-2 p-4">
                <ActionForm action={payBill} submit="Confirmar pagamento">
                  <input type="hidden" name="id" value={b.id} />
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Valor pago (R$)
                    <input name="amount" required inputMode="decimal" defaultValue={centsToInput(b.amount)} placeholder="0,00" className="field tabular-nums" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Data do pagamento
                    <input name="date" type="date" required defaultValue={now} className="field" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Saiu de qual conta?
                    <select name="accountId" required defaultValue="" className="field">
                      <option value="" disabled>
                        Escolha…
                      </option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Quem pagou?
                    <select name="paidBy" required defaultValue={me} className="field">
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
              </div>
            </details>
            <details className="w-full sm:w-auto">
              <summary className="btn-ghost inline-block cursor-pointer list-none">Editar</summary>
              <div className="card mt-2 p-4">
                <ActionForm action={updateBill} submit="Salvar">
                  <input type="hidden" name="id" value={b.id} />
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Valor (R$)
                    <input name="amount" inputMode="decimal" defaultValue={centsToInput(b.amount)} placeholder="0,00" className="field tabular-nums" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Vencimento
                    <input name="dueDate" type="date" defaultValue={b.dueDate ?? ""} className="field" />
                  </label>
                  {b.templateId && (
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" name="remember" defaultChecked />
                      Usar este valor e este dia nos próximos meses
                    </label>
                  )}
                </ActionForm>
                {!b.templateId && (
                  <form action={deleteBill} className="mt-3">
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-xs text-muted underline hover:text-neg">Excluir esta conta</button>
                  </form>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </li>
  );
}

function Section({ title, bills, ...rest }: { title: string; bills: BillRow[]; accounts: Option[]; users: Option[]; me: number; now: string }) {
  if (bills.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted">
        {title} <span className="text-xs">({bills.length})</span>
      </h2>
      <ul className="card divide-y divide-line overflow-hidden">
        {bills.map((b) => (
          <Bill key={b.id} b={b} {...rest} />
        ))}
      </ul>
    </section>
  );
}

export default async function Contas({ searchParams }: PageProps<"/contas">) {
  const me = await requireUser();
  const { mes } = await searchParams;
  const now = today();
  const month = isMonth(typeof mes === "string" ? mes : undefined) ? (mes as string) : currentMonth();
  // Só gera as contas de meses atuais/futuros; meses passados mostram o que já existe.
  if (month >= currentMonth()) ensureMonthBills(month);

  const { bills, transactions, accounts, users, categories } = schema;
  const rows: BillRow[] = db
    .select({
      id: bills.id,
      name: bills.name,
      dueDate: bills.dueDate,
      amount: bills.amountCents,
      paidAt: bills.paidAt,
      payer: users.name,
      account: accounts.name,
      notes: schema.billTemplates.notes,
      templateId: bills.templateId,
    })
    .from(bills)
    .leftJoin(users, eq(users.id, bills.paidByUserId))
    .leftJoin(transactions, eq(transactions.id, bills.transactionId))
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(schema.billTemplates, eq(schema.billTemplates.id, bills.templateId))
    .where(eq(bills.competence, month))
    .orderBy(asc(bills.dueDate), asc(bills.id))
    .all();

  const unpaid = rows.filter((r) => !r.paidAt);
  const paid = rows.filter((r) => r.paidAt);
  const overdue = unpaid.filter((r) => r.dueDate && r.dueDate < now);
  const soon = unpaid.filter((r) => r.dueDate && r.dueDate >= now && daysFrom(r.dueDate, now) <= 7);
  const later = unpaid.filter((r) => !overdue.includes(r) && !soon.includes(r));
  const sum = (l: BillRow[]) => l.reduce((s, r) => s + (r.amount ?? 0), 0);
  const noValue = unpaid.filter((r) => r.amount == null).length;

  const accOptions = db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(eq(accounts.archived, false)).all();
  const userOptions = db.select({ id: users.id, name: users.name }).from(users).all();
  const catOptions = db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.kind, "despesa")).all();
  const shared = { accounts: accOptions, users: userOptions, me: me.id, now };
  const next = shiftMonth(month, 1);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Contas a pagar</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none">{monthLabel(month)}</h1>
        </div>
        <nav aria-label="Mês" className="flex items-center gap-2 text-sm">
          <Link href={`/contas?mes=${shiftMonth(month, -1)}`} className="btn-ghost">
            ← Anterior
          </Link>
          {month !== currentMonth() && (
            <Link href="/contas" className="btn-ghost">
              Este mês
            </Link>
          )}
          <Link href={`/contas?mes=${next}`} className="btn-ghost">
            Próximo →
          </Link>
        </nav>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">Falta pagar</h2>
          <p className="mt-1 font-display text-4xl tabular-nums text-neg">{formatBRL(sum(unpaid))}</p>
          <p className="mt-1 text-xs text-muted">
            {unpaid.length} {unpaid.length === 1 ? "conta" : "contas"}
            {noValue > 0 && ` · ${noValue} sem valor definido`}
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">Atrasadas</h2>
          <p className={`mt-1 font-display text-4xl tabular-nums ${overdue.length ? "text-neg" : ""}`}>{overdue.length}</p>
          <p className="mt-1 text-xs text-muted">{overdue.length ? formatBRL(sum(overdue)) : "Nenhuma atrasada"}</p>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted">Já pago no mês</h2>
          <p className="mt-1 font-display text-4xl tabular-nums text-pos">{formatBRL(sum(paid))}</p>
          <p className="mt-1 text-xs text-muted">{paid.length} {paid.length === 1 ? "conta" : "contas"}</p>
        </div>
      </section>

      {rows.length === 0 && <p className="card p-5 text-sm text-muted">Nenhuma conta neste mês.</p>}
      <Section title="Atrasadas" bills={overdue} {...shared} />
      <Section title="Vencem nos próximos 7 dias" bills={soon} {...shared} />
      <Section title="Pendentes" bills={later} {...shared} />
      <Section title="Pagas" bills={paid} {...shared} />

      <section className="card p-5">
        <h2 className="mb-4 font-display text-2xl uppercase">Nova conta avulsa</h2>
        <ActionForm action={addBill} submit="Adicionar conta">
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Nome
            <input name="name" required maxLength={100} placeholder="Ex.: IPVA, seguro do carro" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Valor (R$, se já souber)
            <input name="amount" inputMode="decimal" placeholder="0,00" className="field tabular-nums" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Vencimento
            <input name="dueDate" type="date" required defaultValue={now} className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Categoria
            <select name="categoryId" defaultValue="" className="field">
              <option value="">Sem categoria</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
