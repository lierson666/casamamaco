import { and, asc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { accountBalance } from "./caixa";
import { shiftMonth } from "./dates";

const { transactions: t, accounts, bills, debts, debtPayments, categories } = schema;

export const monthRange = (month: string) => ({ from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` });

// Saldo de cada conta ativa: saldo inicial + entradas − saídas (de sempre).
export function accountBalances() {
  const accs = db.select().from(accounts).where(eq(accounts.archived, false)).orderBy(asc(accounts.id)).all();
  const sums = db
    .select({ accountId: t.accountId, type: t.type, total: sql<number>`coalesce(sum(${t.amountCents}), 0)` })
    .from(t)
    .groupBy(t.accountId, t.type)
    .all();
  return accs.map((a) => {
    const entradas = sums.find((s) => s.accountId === a.id && s.type === "entrada")?.total ?? 0;
    const saidas = sums.find((s) => s.accountId === a.id && s.type === "saida")?.total ?? 0;
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      openingCents: a.openingBalanceCents,
      entradasCents: entradas,
      saidasCents: saidas,
      balanceCents: accountBalance(a.openingBalanceCents, entradas, saidas),
    };
  });
}

// Gasto (saídas) do mês por categoria. Chave null = sem categoria.
export function spentByCategory(month: string) {
  const { from, to } = monthRange(month);
  const rows = db
    .select({ categoryId: t.categoryId, total: sql<number>`coalesce(sum(${t.amountCents}), 0)` })
    .from(t)
    .where(and(eq(t.type, "saida"), gte(t.date, from), lt(t.date, to)))
    .groupBy(t.categoryId)
    .all();
  return new Map(rows.map((r) => [r.categoryId, r.total]));
}

export function expenseCategories() {
  return db.select().from(categories).where(and(eq(categories.kind, "despesa"), eq(categories.archived, false))).orderBy(asc(categories.id)).all();
}

const billCols = { id: bills.id, name: bills.name, dueDate: bills.dueDate, amountCents: bills.amountCents };
const unpaid = sql`${bills.paidAt} is null`;

// Contas do mês ainda não pagas (já geradas).
export function unpaidBills(month: string) {
  return db.select(billCols).from(bills).where(and(eq(bills.competence, month), unpaid)).orderBy(asc(bills.dueDate), asc(bills.id)).all();
}

// Contas não pagas até o mês informado (inclui atrasadas de meses anteriores): base do saldo previsto.
export function unpaidBillsUpTo(month: string) {
  return db.select(billCols).from(bills).where(and(lte(bills.competence, month), unpaid)).orderBy(asc(bills.dueDate), asc(bills.id)).all();
}

// Contas não pagas atrasadas ou vencendo até `limitIso`, de qualquer mês.
export function dueByDate(limitIso: string) {
  return db
    .select(billCols)
    .from(bills)
    .where(and(unpaid, sql`${bills.dueDate} is not null`, sql`${bills.dueDate} <= ${limitIso}`))
    .orderBy(asc(bills.dueDate), asc(bills.id))
    .all();
}

export function debtsWithRemaining(onlyId?: number) {
  return db
    .select({
      id: debts.id,
      creditor: debts.creditor,
      owner: debts.owner,
      notes: debts.notes,
      originalCents: debts.originalCents,
      paidCents: sql<number>`coalesce(sum(${debtPayments.amountCents}), 0)`,
    })
    .from(debts)
    .leftJoin(debtPayments, eq(debtPayments.debtId, debts.id))
    .where(onlyId === undefined ? undefined : eq(debts.id, onlyId))
    .groupBy(debts.id)
    .orderBy(asc(debts.id))
    .all()
    .map((d) => ({ ...d, remainingCents: d.originalCents - d.paidCents }));
}

export function debtWithRemaining(id: number) {
  return debtsWithRemaining(id)[0];
}

// Entradas e saídas somadas por mês, para o intervalo de meses informado (lista contínua).
export function monthlyTotals(months: string[]) {
  const from = `${months[0]}-01`;
  const to = `${shiftMonth(months[months.length - 1], 1)}-01`;
  return db
    .select({
      month: sql<string>`substr(${t.date}, 1, 7)`,
      type: t.type,
      cents: sql<number>`coalesce(sum(${t.amountCents}), 0)`,
    })
    .from(t)
    .where(and(gte(t.date, from), lt(t.date, to)))
    .groupBy(sql`substr(${t.date}, 1, 7)`, t.type)
    .all();
}

// Gasto do mês agrupado por um nome (categoria, pessoa ou conta).
function spentGroupedBy(month: string, name: ReturnType<typeof sql<string | null>>, joinTable: "categories" | "users" | "accounts") {
  const { from, to } = monthRange(month);
  const base = db.select({ name: name, cents: sql<number>`coalesce(sum(${t.amountCents}), 0)` }).from(t);
  const joined =
    joinTable === "categories"
      ? base.leftJoin(categories, eq(categories.id, t.categoryId))
      : joinTable === "users"
        ? base.leftJoin(schema.users, eq(schema.users.id, t.userId))
        : base.leftJoin(accounts, eq(accounts.id, t.accountId));
  return joined
    .where(and(eq(t.type, "saida"), gte(t.date, from), lt(t.date, to)))
    .groupBy(name)
    .all()
    .map((r) => ({ name: r.name ?? "Sem categoria", cents: r.cents }));
}

export const spentByCategoryName = (month: string) => spentGroupedBy(month, sql<string | null>`${categories.name}`, "categories");
export const spentByPerson = (month: string) => spentGroupedBy(month, sql<string | null>`${schema.users.name}`, "users").map((r) => ({ ...r, name: r.name === "Sem categoria" ? "Sem pessoa" : r.name }));
export const spentByAccount = (month: string) => spentGroupedBy(month, sql<string | null>`${accounts.name}`, "accounts");

export function topExpenses(month: string, limit = 5) {
  const { from, to } = monthRange(month);
  return db
    .select({ id: t.id, date: t.date, description: t.description, cents: t.amountCents })
    .from(t)
    .where(and(eq(t.type, "saida"), gte(t.date, from), lt(t.date, to)))
    .orderBy(sql`${t.amountCents} desc`, asc(t.id))
    .limit(limit)
    .all();
}
