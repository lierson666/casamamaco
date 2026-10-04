"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { userForActivation } from "@/lib/activation";
import * as limit from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";
import { checkTotp, hashRecovery, newRecoveryCodes } from "@/lib/totp";
import { MIN_PASSWORD } from "@/lib/security";
import type { FormState } from "./auth";

const { users, recoveryCodes } = schema;

// Ativa a conta: define a senha nova, confirma o autenticador, gera os códigos de recuperação.
export async function activateAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = userForActivation(String(formData.get("token") ?? ""));
  if (!user) return { error: "Link inválido ou expirado. Peça um novo." };
  if (limit.blocked(`act:${user.id}`)) return { error: "Muitas tentativas. Aguarde 15 minutos." };

  const password = String(formData.get("password") ?? "");
  const again = String(formData.get("password2") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.` };
  if (password !== again) return { error: "As duas senhas não conferem." };
  const local = user.email.split("@")[0].toLowerCase();
  if (local.length >= 5 && password.toLowerCase().includes(local)) return { error: "A senha não pode conter o seu e-mail." };
  if (await bcrypt.compare(password, user.passwordHash)) return { error: "Escolha uma senha diferente da anterior." };

  const step = user.totpSecret ? checkTotp(user.totpSecret, String(formData.get("code") ?? "")) : null;
  if (step === null) {
    limit.fail(`act:${user.id}`);
    return { error: "Código do autenticador inválido. Confira a hora do celular e tente de novo." };
  }

  const codes = newRecoveryCodes();
  const sv = user.sessionVersion + 1;
  db.transaction((tx) => {
    tx.update(users)
      .set({
        passwordHash: bcrypt.hashSync(password, 12),
        totpEnabled: true,
        totpLastStep: step,
        activationHash: null,
        activationExpires: null,
        sessionVersion: sv,
      })
      .where(eq(users.id, user.id))
      .run();
    tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id)).run();
    for (const c of codes) tx.insert(recoveryCodes).values({ userId: user.id, codeHash: hashRecovery(c) }).run();
  });
  limit.clear(`act:${user.id}`);
  await createSession(user.id, sv);
  // Os códigos aparecem uma única vez, numa página própria (esta já não vale: o link foi consumido).
  (await cookies()).set("casa_codes", codes.join(","), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  redirect("/ativar/codigos");
}

export async function finishActivation() {
  (await cookies()).delete("casa_codes");
  redirect("/");
}
