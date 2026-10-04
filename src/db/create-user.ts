// Cria (ou troca a senha de) um usuário, direto no servidor:
//   docker compose exec app npm run user:create
// A senha é digitada no terminal, sem eco, e nunca passa por argumento nem log.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import readline from "node:readline";
import { db, schema } from "./index";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let muted = false;
// Esconde o que for digitado enquanto "muted" estiver ligado.
(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
  if (!muted) process.stdout.write(s);
};

const ask = (q: string, hidden = false) =>
  new Promise<string>((resolve) => {
    process.stdout.write(q);
    muted = hidden;
    rl.question("", (a) => {
      muted = false;
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });

async function main() {
  const name = await ask("Nome: ");
  const email = (await ask("E-mail: ")).toLowerCase();
  const password = await ask("Senha (mín. 8 caracteres): ", true);
  const again = await ask("Repita a senha: ", true);
  rl.close();

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error("Nome ou e-mail inválido.");
    process.exit(1);
  }
  if (password.length < 8 || password !== again) {
    console.error("Senha curta demais (mín. 8) ou as duas não conferem.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (existing) {
    db.update(schema.users).set({ name, passwordHash }).where(eq(schema.users.id, existing.id)).run();
    console.log(`Usuário ${email} atualizado.`);
  } else {
    db.insert(schema.users).values({ name, email, passwordHash }).run();
    console.log(`Usuário ${email} criado.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
