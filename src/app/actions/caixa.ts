"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseBRL, parseSignedBRL } from "@/lib/money";
import type { FormState } from "./auth";

const { transactions, accounts, categories, users } = schema;
const id = z.coerce.number().int().positive();

const refresh = () => {
  revalidatePath("/caixa");
  revalidatePath("/");
};

const income = z.object({
  description: z.string().trim().min(2, "Descreva a entrada.").max(120),
  amount: z.string().refine((v) => parseBRL(v) !== null, "Valor inválido. Exemplo: 3500,00"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  categoryId: id.refine(() => true),
  accountId: id.refine(() => true),
  receivedBy: id.refine(() => true),
});

// Entrada de dinheiro na casa (salário, retirada da empresa, extras).
export async function addIncome(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = income.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: "Preencha todos os campos. " + p.error.issues[0].message };
  const v = p.data;
  const cat = db.select().from(categories).where(eq(categories.id, v.categoryId)).get();
  if (!cat || cat.kind !== "receita") return { error: "Escolha a origem da entrada." };
  if (!db.select().from(accounts).where(eq(accounts.id, v.accountId)).get()) return { error: "Escolha em qual conta entrou." };
  if (!db.select().from(users).where(eq(users.id, v.receivedBy)).get()) return { error: "Escolha quem recebeu." };

  db.insert(transactions)
    .values({
      accountId: v.accountId,
      categoryId: v.categoryId,
      userId: v.receivedBy,
      type: "entrada",
      amountCents: parseBRL(v.amount)!,
      date: v.date,
      description: v.description,
    })
    .run();
  refresh();
  return { ok: "Entrada registrada." };
}

// Saldo inicial: quanto havia na conta antes do primeiro lançamento (aceita zero e negativo).
export async function setOpeningBalance(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z.object({ accountId: id, amount: z.string() }).safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: "Dados inválidos." };
  const cents = parseSignedBRL(p.data.amount);
  if (cents === null) return { error: "Valor inválido. Exemplo: 1500,00 ou -200,00" };
  db.update(accounts).set({ openingBalanceCents: cents }).where(eq(accounts.id, p.data.accountId)).run();
  refresh();
  return { ok: "Saldo inicial salvo." };
}
