"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseBRL, parseSignedBRL } from "@/lib/money";
import { debtsWithRemaining } from "@/lib/queries";
import { DEBT_MONTHLY_KEY, setSetting } from "@/lib/settings";
import type { FormState } from "./auth";

const { debts, debtPayments, transactions, accounts, users, categories } = schema;
const id = z.coerce.number().int().positive();

const refresh = () => {
  revalidatePath("/dividas");
  revalidatePath("/gastos");
  revalidatePath("/caixa");
  revalidatePath("/");
};

export async function payDebt(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({
      debtId: id,
      amount: z.string().refine((v) => parseBRL(v) !== null, "Informe o valor pago. Exemplo: 1000,00"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
      accountId: z.coerce.number().int().positive("Escolha de qual conta saiu."),
      paidBy: z.coerce.number().int().positive("Escolha quem pagou."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;

  const debt = debtsWithRemaining().find((d) => d.id === v.debtId);
  if (!debt) return { error: "Dívida não encontrada." };
  const cents = parseBRL(v.amount)!;
  if (cents > debt.remainingCents) return { error: "O valor é maior que o saldo da dívida." };
  if (!db.select().from(accounts).where(eq(accounts.id, v.accountId)).get()) return { error: "Conta não encontrada." };
  if (!db.select().from(users).where(eq(users.id, v.paidBy)).get()) return { error: "Pessoa não encontrada." };

  const cat = db.select().from(categories).where(eq(categories.name, "Dívidas")).get();
  db.transaction((tx) => {
    const t = tx
      .insert(transactions)
      .values({ accountId: v.accountId, categoryId: cat?.id ?? null, userId: v.paidBy, type: "saida", amountCents: cents, date: v.date, description: `Dívida: ${debt.creditor}` })
      .returning({ id: transactions.id })
      .get();
    tx.insert(debtPayments).values({ debtId: debt.id, date: v.date, amountCents: cents, paidByUserId: v.paidBy, transactionId: t.id }).run();
  });
  refresh();
  return { ok: "Pagamento registrado." };
}

export async function undoDebtPayment(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get("id"));
  if (!Number.isInteger(paymentId) || paymentId <= 0) return;
  const pay = db.select().from(debtPayments).where(eq(debtPayments.id, paymentId)).get();
  if (!pay) return;
  db.transaction((tx) => {
    tx.delete(debtPayments).where(eq(debtPayments.id, pay.id)).run();
    if (pay.transactionId) tx.delete(transactions).where(eq(transactions.id, pay.transactionId)).run();
  });
  refresh();
}

export async function addDebt(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({
      creditor: z.string().trim().min(2, "Informe o credor.").max(100),
      amount: z.string().refine((v) => parseBRL(v) !== null, "Valor inválido. Exemplo: 2500,00"),
      owner: z.string().trim().min(2).max(40),
      notes: z.string().trim().max(300).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  db.insert(debts)
    .values({ creditor: p.data.creditor, originalCents: parseBRL(p.data.amount)!, owner: p.data.owner, notes: p.data.notes || null })
    .run();
  refresh();
  return { ok: "Dívida cadastrada." };
}

// Quanto da casa vai por mês para as dívidas (base do plano de quitação).
export async function setDebtPlan(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const cents = parseSignedBRL(String(formData.get("amount") ?? ""));
  if (cents === null || cents < 0) return { error: "Valor inválido. Exemplo: 2000,00" };
  setSetting(DEBT_MONTHLY_KEY, String(cents));
  refresh();
  return { ok: cents === 0 ? "Plano desligado." : "Plano atualizado." };
}
