import { dailyBackup } from "./backup";
import { addDays, today } from "./dates";
import { interConfigured } from "./inter";
import { lastInterSync, syncInter } from "./inter-sync";

let started = false;

// Tarefas de fundo do servidor (uma vez por processo).
export function startJobs() {
  if (started) return;
  started = true;
  const run = (name: string, fn: () => Promise<unknown>) =>
    fn().then(
      () => console.log(`[jobs] ${name}: ok`),
      (e) => console.error(`[jobs] ${name}: falhou`, e),
    );
  // Backup logo após subir (se faltar o de hoje) e depois a cada hora (o de hoje só é criado uma vez).
  setTimeout(() => run("backup", dailyBackup), 30_000);
  setInterval(() => run("backup", dailyBackup), 60 * 60 * 1000);

  // Inter PJ: uma sincronização por dia, de madrugada (3h às 6h, horário de São Paulo). Se o servidor
  // estava fora do ar nessa janela, recupera assim que subir. O dia da última sync fica no banco
  // (sobrevive a reinício) e uma falha só é tentada de novo depois de 3 horas.
  let lastAttempt = 0;
  setInterval(() => {
    if (!interConfigured() || Date.now() - lastAttempt < 3 * 3600_000) return;
    const hour = Number(new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }));
    const syncedAt = lastInterSync().syncedAt;
    // O instante é guardado em UTC; o "dia" que importa é o de São Paulo.
    const syncedDay = syncedAt ? new Date(syncedAt).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) : null;
    if (syncedDay === today()) return; // já sincronizou hoje
    // Dentro da janela sincroniza; fora dela só se passou um dia inteiro sem sincronizar.
    const inWindow = hour >= 3 && hour < 6;
    const overdue = !syncedDay || syncedDay < addDays(today(), -1);
    if (!inWindow && !overdue) return;
    lastAttempt = Date.now();
    run("inter", () => syncInter(30));
  }, 30 * 60 * 1000);
}
