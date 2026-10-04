import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { dueDateFor } from "./dates";

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
