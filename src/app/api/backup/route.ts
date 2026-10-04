import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { snapshotTo } from "@/lib/backup";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Baixa uma cópia do banco. Só para quem está logado. Contém dados financeiros e hashes de senha.
export async function GET() {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const tmp = path.join(os.tmpdir(), `casa-${Date.now()}.db`);
  try {
    await snapshotTo(tmp);
    const data = fs.readFileSync(tmp);
    return new Response(data, {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="casa-mamaco-${today()}.db"`,
        "cache-control": "no-store",
      },
    });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
