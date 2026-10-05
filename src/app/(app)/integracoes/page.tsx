import { desc } from "drizzle-orm";
import { saveInter, syncInterNow, testInter } from "@/app/actions/inter";
import { ActionForm } from "@/app/ui/action-form";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { interConfigured } from "@/lib/inter";
import { interEntryCount, lastInterSync } from "@/lib/inter-sync";
import { formatBRL } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Integracoes() {
  await requireUser();
  const configured = interConfigured();
  const last = lastInterSync();
  const entries = db.select().from(schema.bankEntries).orderBy(desc(schema.bankEntries.date), desc(schema.bankEntries.id)).limit(30).all();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="h1">Integrações</h1>
        <p className="mt-2 text-sm text-muted">Inter PJ: painel separado, só leitura, com saldo e extrato da conta PJ. Nada aqui entra nos gastos da casa.</p>
      </header>

      <section className="card p-5">
        <h2 className="text-sm font-medium text-muted">Situação</h2>
        <p className={`mt-1 font-medium ${configured ? "text-pos" : "text-neg"}`}>{configured ? "Credenciais salvas no servidor" : "Ainda não configurada"}</p>
        {configured && (
          <p className="mt-1 text-sm text-muted">
            {last.syncedAt ? `Última sincronização: ${new Date(last.syncedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Ainda não sincronizou."}
            {last.saldoCents != null && <> · saldo {formatBRL(last.saldoCents)}</>} · {interEntryCount()} movimentos guardados
          </p>
        )}
        {configured && (
          <div className="mt-4 flex flex-col gap-4">
            <ActionForm action={testInter} submit="Testar conexão" className="flex flex-col gap-2" />
            <ActionForm action={syncInterNow} submit="Sincronizar agora (últimos 30 dias)" className="flex flex-col gap-2" />
            <p className="text-xs text-muted">O servidor também sincroniza sozinho uma vez por dia, de madrugada.</p>
          </div>
        )}
      </section>

      {entries.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Últimos movimentos da PJ</h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  {e.description || "Sem descrição"}
                  <span className="block text-xs text-muted">{formatDay(e.date)}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${e.type === "entrada" ? "text-pos" : ""}`}>
                  {e.type === "entrada" ? "+ " : "− "}
                  {formatBRL(e.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h2 className="h2 mb-1">{configured ? "Trocar credenciais" : "Como ligar"}</h2>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>No Internet Banking do Inter (PJ), abra <b className="text-ink">Integrações / APIs</b> e crie uma <b className="text-ink">nova integração</b>.</li>
          <li>Marque só a permissão de <b className="text-ink">extrato (leitura)</b>. Não marque pagamento nem boleto.</li>
          <li>O Inter mostra o <b className="text-ink">Client ID</b> e o <b className="text-ink">Client Secret</b> e deixa baixar o <b className="text-ink">certificado (.crt)</b> e a <b className="text-ink">chave (.key)</b>.</li>
          <li>Preencha abaixo. Os dados vão direto para o servidor (não passam por mim) e ficam só com permissão do dono.</li>
        </ol>
        <ActionForm action={saveInter} submit="Salvar credenciais" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Client ID
            <input name="clientId" required autoComplete="off" spellCheck={false} className="field font-mono text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Client Secret
            <input name="clientSecret" type="password" required autoComplete="off" className="field font-mono text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Número da conta corrente (só se o Inter pedir)
            <input name="conta" autoComplete="off" inputMode="numeric" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Certificado (.crt)
            <input name="cert" type="file" required accept=".crt,.pem,.cer" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Chave privada (.key)
            <input name="key" type="file" required accept=".key,.pem" className="field" />
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
