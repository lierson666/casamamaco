"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db, schema } from "@/db";
import { issueActivation } from "@/lib/activation";
import { requireUser } from "@/lib/auth";
import * as limit from "@/lib/rate-limit";
import { MIN_PASSWORD } from "@/lib/security";
import { clearMfaPending, createMfaPending, createSession, destroySession, readMfaPending } from "@/lib/session";
import { checkTotp, hashRecovery, newRecoveryCodes } from "@/lib/totp";

const { users, recoveryCodes } = schema;

export type FormState = { error?: string; ok?: string; codes?: string[] } | undefined;

const credentials = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z.string().min(1),
});

// Passo 1: e-mail e senha. Conta ativada segue para o código do autenticador.
export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "E-mail ou senha incorretos." };
  const { email, password } = parsed.data;

  if (limit.blocked(`login:${email}`)) return { error: "Muitas tentativas. Aguarde 15 minutos." };

  const user = db.select().from(users).where(eq(users.email, email)).get();
  // Compara mesmo sem usuário, para não revelar quais e-mails existem.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    limit.fail(`login:${email}`);
    return { error: "E-mail ou senha incorretos." };
  }
  limit.clear(`login:${email}`);
  if (!user.totpEnabled) {
    return { error: "Esta conta ainda não foi ativada. Use o link de ativação que você recebeu (ou peça um novo)." };
  }
  await createMfaPending(user.id);
  redirect("/login/2fa");
}

// Passo 2: código de 6 dígitos do autenticador ou um código de recuperação.
export async function verifyMfa(_: FormState, formData: FormData): Promise<FormState> {
  const uid = await readMfaPending();
  if (!uid) redirect("/login");
  if (limit.blocked(`mfa:${uid}`)) return { error: "Muitas tentativas. Aguarde 15 minutos e entre de novo." };

  const user = db.select().from(users).where(eq(users.id, uid)).get();
  if (!user || !user.totpEnabled || !user.totpSecret) redirect("/login");

  const raw = String(formData.get("code") ?? "").trim();
  let good = false;
  const step = checkTotp(user.totpSecret, raw);
  if (step !== null) {
    // Cada código vale uma vez só: recusa passo já usado.
    if (step > user.totpLastStep) {
      db.update(users).set({ totpLastStep: step }).where(eq(users.id, user.id)).run();
      good = true;
    }
  } else if (raw.length >= 8) {
    const h = hashRecovery(raw);
    const rc = db.select().from(recoveryCodes).where(eq(recoveryCodes.userId, user.id)).all().find((r) => r.codeHash === h && !r.usedAt);
    if (rc) {
      db.update(recoveryCodes).set({ usedAt: new Date().toISOString() }).where(eq(recoveryCodes.id, rc.id)).run();
      good = true;
    }
  }
  if (!good) {
    limit.fail(`mfa:${uid}`);
    return { error: "Código inválido ou já usado." };
  }
  limit.clear(`mfa:${uid}`);
  await clearMfaPending();
  await createSession(user.id, user.sessionVersion);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

const passwordChange = z.object({
  current: z.string().min(1, "Informe a senha atual."),
  next: z.string().min(MIN_PASSWORD, `A nova senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`),
});

// Troca a própria senha. Derruba as outras sessões e mantém esta.
export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const parsed = passwordChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { current, next } = parsed.data;

  const user = db.select().from(users).where(eq(users.id, me.id)).get();
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "A senha atual não confere." };
  if (current === next) return { error: "A nova senha precisa ser diferente da atual." };

  const sv = user.sessionVersion + 1;
  db.update(users).set({ passwordHash: await bcrypt.hash(next, 12), sessionVersion: sv }).where(eq(users.id, me.id)).run();
  await createSession(me.id, sv);
  return { ok: "Senha trocada. Os outros aparelhos foram desconectados." };
}

// Novos códigos de recuperação (os antigos deixam de valer). Confirma com um código do app.
export async function regenerateRecovery(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  if (limit.blocked(`rec:${me.id}`)) return { error: "Muitas tentativas. Aguarde 15 minutos." };
  const user = db.select().from(users).where(eq(users.id, me.id)).get();
  const step = user?.totpSecret ? checkTotp(user.totpSecret, String(formData.get("code") ?? "")) : null;
  if (!user || step === null || step <= user.totpLastStep) {
    limit.fail(`rec:${me.id}`);
    return { error: "Código do autenticador inválido ou já usado." };
  }
  const codes = newRecoveryCodes();
  db.transaction((tx) => {
    tx.update(users).set({ totpLastStep: step }).where(eq(users.id, me.id)).run();
    tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, me.id)).run();
    for (const c of codes) tx.insert(recoveryCodes).values({ userId: me.id, codeHash: hashRecovery(c) }).run();
  });
  return { codes };
}

const newUser = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
});

// Cadastra outra pessoa: gera um link de ativação (a pessoa define a própria senha e o autenticador).
export async function addUser(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = newUser.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;
  if (db.select().from(users).where(eq(users.email, email)).get()) return { error: "Já existe um usuário com esse e-mail." };

  const unusable = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const u = db.insert(users).values({ name, email, passwordHash: unusable }).returning({ id: users.id }).get();
  return { ok: `${name} cadastrado(a). Link de ativação (vale 24 h, uso único): ${issueActivation(u.id)}` };
}

// Quem perdeu o celular/senha: outra pessoa gera um novo link (zera o autenticador e derruba as sessões).
export async function createActivationLink(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const id = Number(formData.get("userId"));
  if (!Number.isInteger(id) || id <= 0 || id === me.id) return { error: "Escolha outra pessoa. O seu próprio acesso você troca em 'Trocar minha senha'." };
  const target = db.select().from(users).where(eq(users.id, id)).get();
  if (!target) return { error: "Usuário não encontrado." };
  return { ok: `Link para ${target.name} (vale 24 h, uso único): ${issueActivation(id)}` };
}

