"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { accountById, categoryById, userExists } from "@/lib/lookup";
import { parseBRL } from "@/lib/money";
import { idField, isoDate, moneyField } from "@/lib/validation";
import type { FormState } from "./auth";

const expense = z.object({
  description: z.string().trim().min(2, "Descreva o gasto.").max(120),
  amount: moneyField(),
  date: isoDate,
  categoryId: idField,
  accountId: idField,
  paidBy: idField,
});

export async function addExpense(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const parsed = expense.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  if (!accountById(v.accountId) || !categoryById(v.categoryId) || !userExists(v.paidBy)) {
    return { error: "Conta, categoria ou pessoa não encontrada." };
  }

  db.insert(schema.transactions)
    .values({
      accountId: v.accountId,
      categoryId: v.categoryId,
      userId: v.paidBy, // quem pagou
      type: "saida",
      amountCents: parseBRL(v.amount)!,
      date: v.date,
      description: v.description,
    })
    .run();
  void me;
  revalidatePath("/gastos");
  return { ok: "Gasto registrado." };
}

export async function deleteExpense(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    db.delete(schema.transactions).where(eq(schema.transactions.id, id)).run();
    revalidatePath("/gastos");
  }
}
