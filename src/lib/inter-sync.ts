// Sincroniza o extrato do Inter PJ para a tabela bank_entries (sem duplicar) e guarda o saldo.
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, today } from "./dates";
import { interConfigured, interExtrato, interSaldo } from "./inter";
import { getSetting, setSetting } from "./settings";

export const INTER_SALDO_KEY = "inter.saldo_cents";
export const INTER_SYNC_KEY = "inter.synced_at";

export type SyncResult = { saldoCents: number; fetched: number; inserted: number };

// Busca os últimos `days` dias (o Inter limita ~90 por consulta) e insere o que for novo.
export async function syncInter(days = 30): Promise<SyncResult> {
  if (!interConfigured()) throw new Error("Integração com o Inter ainda não configurada.");
  const fim = today();
  const entries = await interExtrato(addDays(fim, -Math.min(days, 90)), fim);
  const saldoCents = await interSaldo();

  let inserted = 0;
  db.transaction((tx) => {
    for (const e of entries) {
      const r = tx
        .insert(schema.bankEntries)
        .values({ provider: "inter", extKey: e.extKey, date: e.date, type: e.type, amountCents: e.amountCents, description: e.description })
        .onConflictDoNothing()
        .run();
      inserted += r.changes;
    }
  });
  setSetting(INTER_SALDO_KEY, String(saldoCents));
  setSetting(INTER_SYNC_KEY, new Date().toISOString());
  return { saldoCents, fetched: entries.length, inserted };
}

export const lastInterSync = () => ({
  saldoCents: getSetting(INTER_SALDO_KEY) == null ? null : Number(getSetting(INTER_SALDO_KEY)),
  syncedAt: getSetting(INTER_SYNC_KEY),
});

export const interEntryCount = () => db.select({ n: sql<number>`count(*)` }).from(schema.bankEntries).get()!.n;
