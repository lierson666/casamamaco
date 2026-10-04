"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";
import type { FormState } from "./auth";

const expense = z.object({
  description: z.string().trim().min(2, "Descreva o gasto.").max(120),
  amount: z.string().refine((v) => parseBRL(v) !== null, "Valor inválido. Exemplo: 125,90"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  categoryId: z.coerce.number().int().positive("Escolha a categoria."),
  accountId: z.coerce.number().int().positive("Escolha de qual conta saiu."),
  paidBy: z.coerce.number().int().positive("Escolha quem pagou."),
});

export async function addExpense(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const parsed = expense.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const okRefs =
    db.select().from(schema.accounts).where(eq(schema.accounts.id, v.accountId)).get() &&
    db.select().from(schema.categories).where(eq(schema.categories.id, v.categoryId)).get() &&
    db.select().from(schema.users).where(eq(schema.users.id, v.paidBy)).get();
  if (!okRefs) return { error: "Conta, categoria ou pessoa não encontrada." };

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
