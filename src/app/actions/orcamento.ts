"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { suggestLimit } from "@/lib/budget";
import { isMonth, shiftMonth } from "@/lib/dates";
import { parseSignedBRL } from "@/lib/money";
import { expenseCategories, spentByCategory } from "@/lib/queries";
import type { FormState } from "./auth";

const { budgets } = schema;

const refresh = () => {
  revalidatePath("/orcamento");
  revalidatePath("/");
};

// Define (ou limpa, com valor vazio ou 0) o teto de uma categoria no mês.
export async function setLimit(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({ month: z.string().refine(isMonth, "Mês inválido."), categoryId: z.coerce.number().int().positive(), amount: z.string() })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const { month, categoryId, amount } = p.data;

  const cents = amount.trim() === "" ? 0 : parseSignedBRL(amount);
  if (cents === null || cents < 0) return { error: "Valor inválido. Exemplo: 800,00" };
  if (cents === 0) {
    db.delete(budgets).where(and(eq(budgets.categoryId, categoryId), eq(budgets.month, month))).run();
  } else {
    db.insert(budgets)
      .values({ categoryId, month, limitCents: cents })
      .onConflictDoUpdate({ target: [budgets.categoryId, budgets.month], set: { limitCents: cents } })
      .run();
  }
  refresh();
  return { ok: cents === 0 ? "Teto removido." : "Teto salvo." };
}

// Preenche os tetos vazios do mês com a média dos 2 meses anteriores (só categorias com histórico).
export async function suggestLimits(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const month = String(formData.get("month") ?? "");
  if (!isMonth(month)) return { error: "Mês inválido." };

  const history = [shiftMonth(month, -2), shiftMonth(month, -1)].map(spentByCategory);
  const existing = new Set(db.select().from(budgets).where(eq(budgets.month, month)).all().map((b) => b.categoryId));
  let created = 0;
  for (const c of expenseCategories()) {
    if (existing.has(c.id)) continue;
    const spent = history.map((h) => h.get(c.id) ?? 0).filter((x) => x > 0);
    const limit = suggestLimit(spent);
    if (limit === null) continue;
    db.insert(budgets).values({ categoryId: c.id, month, limitCents: limit }).run();
    created++;
  }
  refresh();
  return created > 0
    ? { ok: `${created} ${created === 1 ? "teto sugerido" : "tetos sugeridos"} pelo histórico. Ajuste como quiser.` }
    : { error: "Ainda não há histórico de gastos dos 2 meses anteriores para sugerir." };
}
