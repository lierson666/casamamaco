import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export function getSetting(key: string): string | null {
  return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } }).run();
}

export const DEBT_MONTHLY_KEY = "debt.monthly_cents";
