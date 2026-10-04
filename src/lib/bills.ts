import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

// Vencimento do mês; dia 31 em mês de 30 dias vira o último dia.
export function dueDateFor(month: string, day: number | null) {
  if (!day) return null;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

// Cria as contas do mês a partir dos modelos recorrentes (idempotente).
export function ensureMonthBills(month: string) {
  const templates = db
    .select()
    .from(schema.billTemplates)
    .where(eq(schema.billTemplates.active, true))
    .all();
  for (const t of templates) {
    db.insert(schema.bills)
      .values({
        templateId: t.id,
        name: t.name,
        categoryId: t.categoryId,
        competence: month,
        dueDate: dueDateFor(month, t.dueDay),
        amountCents: t.expectedAmountCents,
      })
      .onConflictDoNothing()
      .run();
  }
}
