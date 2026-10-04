"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

const credentials = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
});
const newUser = credentials.extend({
  name: z.string().trim().min(2, "Informe o nome."),
});

// Freio simples contra tentativas de senha (em memória, por e-mail).
const attempts = new Map<string, { n: number; since: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function tooManyAttempts(email: string) {
  const a = attempts.get(email);
  if (!a || Date.now() - a.since > WINDOW_MS) return false;
  return a.n >= MAX_ATTEMPTS;
}
function registerFailure(email: string) {
  const a = attempts.get(email);
  if (!a || Date.now() - a.since > WINDOW_MS) {
    attempts.set(email, { n: 1, since: Date.now() });
  } else a.n += 1;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "E-mail ou senha incorretos." };
  const { email, password } = parsed.data;

  if (tooManyAttempts(email)) {
    return { error: "Muitas tentativas. Aguarde 15 minutos." };
  }
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();
  // Compara mesmo sem usuário, para não revelar quais e-mails existem.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    registerFailure(email);
    return { error: "E-mail ou senha incorretos." };
  }
  attempts.delete(email);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// Cadastro da segunda pessoa da casa, por quem já está logado.
export async function addUser(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = newUser.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (db.select().from(schema.users).where(eq(schema.users.email, email)).get()) {
    return { error: "Já existe um usuário com esse e-mail." };
  }
  db.insert(schema.users)
    .values({ name, email, passwordHash: await bcrypt.hash(password, 12) })
    .run();
  return { ok: `${name} cadastrado(a).` };
}
