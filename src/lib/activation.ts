import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newActivationToken, sha256 } from "./totp";

const { users, recoveryCodes } = schema;
const HOURS = 24;

export const appUrl = () => process.env.APP_URL ?? "https://casamamaco.com.br";

// Gera (ou renova) o link de ativação de uma conta. Zera o 2FA e derruba as sessões antigas.
export function issueActivation(userId: number) {
  const token = newActivationToken();
  const expires = new Date(Date.now() + HOURS * 3600_000).toISOString();
  db.transaction((tx) => {
    tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId)).run();
    tx.update(users)
      .set({
        totpEnabled: false,
        totpSecret: null,
        totpLastStep: 0,
        activationHash: sha256(token),
        activationExpires: expires,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, userId))
      .run();
  });
  return `${appUrl()}/ativar?t=${token}`;
}

export function userForActivation(token: string | undefined) {
  if (!token) return null;
  const u = db.select().from(users).where(eq(users.activationHash, sha256(token))).get();
  if (!u || !u.activationExpires || u.activationExpires < new Date().toISOString()) return null;
  return u;
}
