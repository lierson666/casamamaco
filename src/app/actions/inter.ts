"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireUser } from "@/lib/auth";
import { interConfigured, interSaldo, saveInterSecrets } from "@/lib/inter";
import { syncInter } from "@/lib/inter-sync";
import { formatBRL } from "@/lib/money";
import type { FormState } from "./auth";

const MAX_FILE = 20_000; // certificado e chave são pequenos; recusa qualquer outra coisa

const readPem = async (f: FormDataEntryValue | null, label: RegExp) => {
  if (!(f instanceof File) || f.size === 0 || f.size > MAX_FILE) return null;
  const text = (await f.text()).trim();
  return label.test(text) ? text + "\n" : null;
};

const refresh = () => {
  revalidatePath("/integracoes");
  revalidatePath("/caixa");
};

// Guarda as credenciais do Inter Empresas (client_id/secret + certificado e chave) no servidor.
export async function saveInter(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = z
    .object({
      clientId: z.string().trim().min(8, "Informe o Client ID.").max(200),
      clientSecret: z.string().trim().min(8, "Informe o Client Secret.").max(200),
      conta: z.string().trim().max(30).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };

  const cert = await readPem(formData.get("cert"), /-----BEGIN CERTIFICATE-----/);
  if (!cert) return { error: "Anexe o certificado (.crt) que o Inter gerou." };
  const key = await readPem(formData.get("key"), /-----BEGIN (RSA |EC )?PRIVATE KEY-----/);
  if (!key) return { error: "Anexe a chave privada (.key) que o Inter gerou." };

  saveInterSecrets({ clientId: p.data.clientId, clientSecret: p.data.clientSecret, conta: p.data.conta || undefined, cert, key });
  refresh();
  return { ok: "Credenciais salvas no servidor. Agora clique em “Testar conexão”." };
}

export async function testInter(_: FormState, __: FormData): Promise<FormState> {
  await requireUser();
  if (!interConfigured()) return { error: "Salve as credenciais primeiro." };
  try {
    return { ok: `Conexão ok. Saldo disponível na PJ: ${formatBRL(await interSaldo())}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao falar com o Inter." };
  }
}

export async function syncInterNow(_: FormState, __: FormData): Promise<FormState> {
  await requireUser();
  try {
    const r = await syncInter(30);
    refresh();
    return { ok: `Sincronizado: ${r.fetched} movimentos lidos, ${r.inserted} novos. Saldo ${formatBRL(r.saldoCents)}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao sincronizar." };
  }
}
