// Gera o link de ativação de uma conta (cria a conta se não existir). Rode no servidor:
//   docker compose exec -T app npm run user:link -- --nome Fulana --email fulana@x.com
// A pessoa abre o link, define a própria senha e configura o app autenticador.
// O link vale 24 h e é de uso único; a senha antiga (se houver) deixa de valer.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { issueActivation } from "../lib/activation";
import { db, schema } from "./index";

function arg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("--email")?.trim().toLowerCase();
  const name = arg("--nome")?.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error("Use: npm run user:link -- --email x@y.com [--nome Fulana]");
    process.exit(1);
  }
  let user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user) {
    if (!name) {
      console.error("Usuário novo: informe também --nome.");
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    user = db.insert(schema.users).values({ name, email, passwordHash }).returning().get();
    console.log(`Usuário ${email} criado.`);
  }
  console.log(`Link de ativação para ${user.name} (vale 24 h, uso único):\n${issueActivation(user.id)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
