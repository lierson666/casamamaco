"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import type { FormState } from "./auth";

const { bills, billTemplates, transactions, accounts, users } = schema;

const optionalMoney = z
  .string()
  .trim()
  .refine((v) => v === "" || parseBRL(v) !== null, "Valor inválido. Exemplo: 125,90");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const optionalDate = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.");
const id = z.coerce.number().int().positive();

const refresh = () => {
  revalidatePath("/contas");
  revalidatePath("/gastos");
  revalidatePath("/");
};

export async function updateBill(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({ id, amount: optionalMoney, dueDate: optionalDate })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const bill = db.select().from(bills).where(eq(bills.id, p.data.id)).get();
  if (!bill) return { error: "Conta não encontrada." };
  if (bill.paidAt) return { error: "Desfaça o pagamento antes de editar." };

  const amountCents = p.data.amount === "" ? null : parseBRL(p.data.amount);
  const dueDate = p.data.dueDate === "" ? null : p.data.dueDate;
  db.update(bills).set({ amountCents, dueDate }).where(eq(bills.id, bill.id)).run();

  // "Lembrar para os próximos meses": guarda valor e dia no modelo da conta.
  if (formData.get("remember") === "on" && bill.templateId) {
    db.update(billTemplates)
      .set({ expectedAmountCents: amountCents, dueDay: dueDate ? Number(dueDate.slice(8, 10)) : null })
      .where(eq(billTemplates.id, bill.templateId))
      .run();
  }
  refresh();
  return { ok: "Conta atualizada." };
}

export async function payBill(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({
      id,
      accountId: id.refine(() => true),
      paidBy: id,
      date: isoDate,
      amount: z.string().refine((v) => parseBRL(v) !== null, "Informe o valor pago. Exemplo: 125,90"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;

  const bill = db.select().from(bills).where(eq(bills.id, v.id)).get();
  if (!bill) return { error: "Conta não encontrada." };
  if (bill.paidAt) return { error: "Esta conta já está paga." };
  if (!db.select().from(accounts).where(eq(accounts.id, v.accountId)).get()) return { error: "Escolha de qual conta saiu." };
  if (!db.select().from(users).where(eq(users.id, v.paidBy)).get()) return { error: "Escolha quem pagou." };

  const cents = parseBRL(v.amount)!;
  db.transaction((tx) => {
    const t = tx
      .insert(transactions)
      .values({
        accountId: v.accountId,
        categoryId: bill.categoryId,
        userId: v.paidBy,
        type: "saida",
        amountCents: cents,
        date: v.date,
        description: bill.name,
      })
      .returning({ id: transactions.id })
      .get();
    tx.update(bills)
      .set({ amountCents: cents, paidAt: v.date, paidByUserId: v.paidBy, transactionId: t.id })
      .where(eq(bills.id, bill.id))
      .run();
  });
  refresh();
  return { ok: "Pagamento registrado." };
}

export async function unpayBill(formData: FormData) {
  await requireUser();
  const billId = Number(formData.get("id"));
  if (!Number.isInteger(billId) || billId <= 0) return;
  const bill = db.select().from(bills).where(eq(bills.id, billId)).get();
  if (!bill?.paidAt) return;
  db.transaction((tx) => {
    tx.update(bills).set({ paidAt: null, paidByUserId: null, transactionId: null }).where(eq(bills.id, bill.id)).run();
    if (bill.transactionId) tx.delete(transactions).where(eq(transactions.id, bill.transactionId)).run();
  });
  refresh();
}

export async function addBill(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({
      name: z.string().trim().min(2, "Dê um nome à conta.").max(100),
      amount: optionalMoney,
      dueDate: isoDate,
      categoryId: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  const categoryId = v.categoryId ? Number(v.categoryId) || null : null;

  db.insert(bills)
    .values({
      name: v.name,
      categoryId,
      competence: v.dueDate.slice(0, 7),
      dueDate: v.dueDate,
      amountCents: v.amount === "" ? null : parseBRL(v.amount),
    })
    .run();
  refresh();
  return { ok: "Conta adicionada." };
}

export async function deleteBill(formData: FormData) {
  await requireUser();
  const billId = Number(formData.get("id"));
  if (!Number.isInteger(billId) || billId <= 0) return;
  const bill = db.select().from(bills).where(eq(bills.id, billId)).get();
  if (bill && !bill.paidAt) {
    db.delete(bills).where(eq(bills.id, bill.id)).run();
    refresh();
  }
}
