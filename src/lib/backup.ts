import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/db";
import { today } from "./dates";

const dataDir = path.dirname(process.env.DATABASE_PATH ?? "./data/casa.db");
export const backupDir = path.join(dataDir, "backups");
const KEEP = 30;

// Cópia consistente do banco (mesmo com o app em uso). Devolve o caminho do arquivo.
export async function snapshotTo(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  await sqlite.backup(file);
  fs.chmodSync(file, 0o600);
  return file;
}

// Uma cópia por dia, guardando as últimas 30. Seguro chamar várias vezes no mesmo dia.
export async function dailyBackup() {
  const file = path.join(backupDir, `casa-${today()}.db`);
  if (!fs.existsSync(file)) {
    const tmp = file + ".tmp";
    await snapshotTo(tmp);
    fs.renameSync(tmp, file);
  }
  const old = fs
    .readdirSync(backupDir)
    .filter((f) => /^casa-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort()
    .reverse()
    .slice(KEEP);
  for (const f of old) fs.unlinkSync(path.join(backupDir, f));
  return file;
}
