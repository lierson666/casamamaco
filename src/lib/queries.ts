import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
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

// Contas do mês ainda não pagas (já geradas).
export function unpaidBills(month: string) {
  return db
    .select({ id: bills.id, name: bills.name, dueDate: bills.dueDate, amountCents: bills.amountCents })
    .from(bills)
    .where(and(eq(bills.competence, month), sql`${bills.paidAt} is null`))
    .orderBy(asc(bills.dueDate), asc(bills.id))
    .all();
}

// Todas as contas em atraso, de qualquer mês.
export function overdueBills(todayIso: string) {
  return db
    .select({ id: bills.id, name: bills.name, dueDate: bills.dueDate, amountCents: bills.amountCents })
    .from(bills)
    .where(and(sql`${bills.paidAt} is null`, sql`${bills.dueDate} is not null`, lt(bills.dueDate, todayIso)))
    .orderBy(asc(bills.dueDate))
    .all();
}

export function debtsWithRemaining() {
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
    .groupBy(debts.id)
    .orderBy(asc(debts.id))
    .all()
    .map((d) => ({ ...d, remainingCents: d.originalCents - d.paidCents }));
}

// Contas não pagas atrasadas ou vencendo até `limitIso`, de qualquer mês.
export function dueByDate(limitIso: string) {
  return db
    .select({ id: bills.id, name: bills.name, dueDate: bills.dueDate, amountCents: bills.amountCents })
    .from(bills)
    .where(and(sql`${bills.paidAt} is null`, sql`${bills.dueDate} is not null`, sql`${bills.dueDate} <= ${limitIso}`))
    .orderBy(asc(bills.dueDate), asc(bills.id))
    .all();
}
