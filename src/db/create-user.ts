// Cria (ou troca a senha de) um usuário, direto no servidor.
//
// Interativo (a senha é digitada no terminal, sem eco):
//   docker compose exec app npm run user:create
//
// Com senha vinda do stdin (não aparece em argumentos nem em log):
//   printf '%s' "$SENHA" | docker compose exec -T app npm run user:create -- --nome X --email x@y.com --senha-stdin
//
// Automático, com senha provisória aleatória (não aparece no terminal: vai para
// <pasta do banco>/credenciais-iniciais.txt, só legível pelo dono; apague depois de ler):
//   docker compose exec -T app npm run user:create -- --nome Fulana --email fulana@x.com --aleatoria
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { db, schema } from "./index";

function arg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

let rl: readline.Interface | undefined;
let muted = false;
function ask(q: string, hidden = false) {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Esconde o que for digitado enquanto "muted" estiver ligado.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
      if (!muted) process.stdout.write(s);
    };
  }
  return new Promise<string>((resolve) => {
    process.stdout.write(q);
    muted = hidden;
    rl!.question("", (a) => {
      muted = false;
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

async function main() {
  const random = process.argv.includes("--aleatoria");
  const name = arg("--nome") ?? (await ask("Nome: "));
  const email = (arg("--email") ?? (await ask("E-mail: "))).toLowerCase();

  let password: string;
  if (process.argv.includes("--senha-stdin")) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    password = data.replace(/\r?\n$/, "");
  } else if (random) {
    password = randomBytes(12).toString("base64url"); // 16 caracteres
  } else {
    password = await ask("Senha (mín. 8 caracteres): ", true);
    const again = await ask("Repita a senha: ", true);
    if (password !== again) {
      console.error("As duas senhas não conferem.");
      process.exit(1);
    }
  }
  rl?.close();

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error("Nome ou e-mail inválido.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Senha curta demais (mín. 8).");
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

  if (random) {
    const file = path.join(path.dirname(process.env.DATABASE_PATH ?? "./data/casa.db"), "credenciais-iniciais.txt");
    fs.appendFileSync(file, `${name} <${email}>  senha provisória: ${password}\n`, { mode: 0o600 });
    fs.chmodSync(file, 0o600);
    console.log(`Senha provisória gravada em ${file} (não é exibida aqui).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
