// Checagens de existência usadas pelas Server Actions antes de gravar.
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const accountById = (id: number) => db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();
export const userExists = (id: number) => !!db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, id)).get();
export const categoryById = (id: number) => db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
