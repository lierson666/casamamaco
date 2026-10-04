import { dailyBackup } from "./backup";

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
}
