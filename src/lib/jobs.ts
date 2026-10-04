import { dailyBackup } from "./backup";
import { today } from "./dates";
import { interConfigured } from "./inter";
import { syncInter } from "./inter-sync";

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

  // Inter PJ: uma sincronização por dia, de madrugada (a partir das 3h, horário de São Paulo).
  let lastInterDay = "";
  setInterval(() => {
    const hour = Number(new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }));
    if (!interConfigured() || hour < 3 || lastInterDay === today()) return;
    lastInterDay = today();
    run("inter", () => syncInter(30));
  }, 30 * 60 * 1000);
}
