import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "casa_session";
export const MFA_COOKIE = "casa_mfa";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MFA_SECONDS = 5 * 60;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mín. 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>, seconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(key());
}

async function read(token: string | undefined) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, key(), { algorithms: ["HS256"] })).payload;
  } catch {
    return null;
  }
}

const opts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

// Sessão completa. "sv" liga o cookie à versão da conta: trocar senha/2FA derruba as antigas.
export async function verifySession(token: string | undefined) {
  const p = await read(token);
  return p && typeof p.uid === "number" && typeof p.sv === "number" && p.stage === undefined
    ? { userId: p.uid, sv: p.sv }
    : null;
}

export async function createSession(userId: number, sv: number) {
  (await cookies()).set(SESSION_COOKIE, await sign({ uid: userId, sv }, MAX_AGE_SECONDS), opts(MAX_AGE_SECONDS));
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(MFA_COOKIE);
}

// Meio do login: senha confere, falta o código do autenticador (vale 5 minutos).
export async function createMfaPending(userId: number) {
  (await cookies()).set(MFA_COOKIE, await sign({ uid: userId, stage: "mfa" }, MFA_SECONDS), opts(MFA_SECONDS));
}

export async function readMfaPending() {
  const p = await read((await cookies()).get(MFA_COOKIE)?.value);
  return p && p.stage === "mfa" && typeof p.uid === "number" ? p.uid : null;
}

export async function clearMfaPending() {
  (await cookies()).delete(MFA_COOKIE);
}
