import { createHash, randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const totpFor = (secret: string, label = "Casa Mamaco") =>
  new OTPAuth.TOTP({
    issuer: "Casa Mamaco",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

export const newTotpSecret = () => new OTPAuth.Secret({ size: 20 }).base32;

export async function qrFor(secret: string, email: string) {
  return QRCode.toDataURL(totpFor(secret, email).toString(), { margin: 1, width: 220 });
}

// Devolve o "passo" de 30 s em que o código vale, ou null. O chamador recusa passo já usado.
export function checkTotp(secret: string, code: string): number | null {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  const delta = totpFor(secret).validate({ token, window: 1 });
  return delta === null ? null : Math.floor(Date.now() / 30_000) + delta;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// 8 códigos de uso único, ex.: "K7QD2-M9XPA". Só o hash é guardado.
export function newRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const b = randomBytes(10);
    const c = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  });
}

export const normalizeRecovery = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const hashRecovery = (code: string) => sha256(normalizeRecovery(code));

export const newActivationToken = () => randomBytes(32).toString("base64url");
