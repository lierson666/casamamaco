// Cliente somente-leitura da API Banking do Inter Empresas (PJ): saldo e extrato.
// Autenticação: OAuth2 client_credentials + mTLS (certificado .crt e chave .key).
// Os segredos ficam em <pasta do banco>/secrets/inter (modo 600), nunca no código/git.
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const dir = path.join(path.dirname(process.env.DATABASE_PATH ?? "./data/casa.db"), "secrets", "inter");
const files = { config: path.join(dir, "config.json"), cert: path.join(dir, "inter.crt"), key: path.join(dir, "inter.key") };
const BASE = new URL(process.env.INTER_BASE_URL ?? "https://cdpj.partners.bancointer.com.br");

type Config = { clientId: string; clientSecret: string; conta?: string };

export function readConfig(): Config | null {
  try {
    return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ files.config, "utf8")) as Config;
  } catch {
    return null;
  }
}

export const interConfigured = () =>
  !!readConfig() && fs.existsSync(/*turbopackIgnore: true*/ files.cert) && fs.existsSync(/*turbopackIgnore: true*/ files.key);

export function saveInterSecrets(v: Config & { cert: string; key: string }) {
  fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true, mode: 0o700 });
  const write = (f: string, data: string) => {
    fs.writeFileSync(/*turbopackIgnore: true*/ f, data, { mode: 0o600 });
    fs.chmodSync(/*turbopackIgnore: true*/ f, 0o600);
  };
  write(files.config, JSON.stringify({ clientId: v.clientId, clientSecret: v.clientSecret, conta: v.conta || undefined }));
  write(files.cert, v.cert);
  write(files.key, v.key);
  cached = null;
}

type Res = { status: number; text: string; json: unknown };

function call(method: "GET" | "POST", pathname: string, opts: { query?: Record<string, string>; headers?: Record<string, string>; body?: string } = {}): Promise<Res> {
  const qs = opts.query ? "?" + new URLSearchParams(opts.query).toString() : "";
  const secure = BASE.protocol === "https:";
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request(
      {
        hostname: BASE.hostname,
        port: BASE.port || (secure ? 443 : 80),
        path: pathname + qs,
        method,
        headers: { ...(opts.body ? { "content-length": Buffer.byteLength(opts.body) } : {}), ...opts.headers },
        timeout: 20_000,
        ...(secure ? { cert: fs.readFileSync(/*turbopackIgnore: true*/ files.cert), key: fs.readFileSync(/*turbopackIgnore: true*/ files.key) } : {}),
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let json: unknown = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode ?? 0, text, json });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("O Inter não respondeu a tempo.")));
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const short = (r: Res) => (r.text || "sem corpo").replace(/\s+/g, " ").slice(0, 200);

let cached: { token: string; exp: number } | null = null;

async function token() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const cfg = readConfig();
  if (!cfg || !interConfigured()) throw new Error("Integração com o Inter ainda não configurada.");
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "client_credentials",
    scope: "extrato.read",
  }).toString();
  const r = await call("POST", "/oauth/v2/token", { body, headers: { "content-type": "application/x-www-form-urlencoded" } });
  const t = (r.json as { access_token?: string; expires_in?: number } | null)?.access_token;
  if (r.status !== 200 || !t) throw new Error(`O Inter recusou o acesso (${r.status}): ${short(r)}`);
  cached = { token: t, exp: Date.now() + ((r.json as { expires_in?: number }).expires_in ?? 3600) * 1000 };
  return t;
}

async function get(pathname: string, query: Record<string, string> = {}) {
  const cfg = readConfig()!;
  const r = await call("GET", pathname, {
    query,
    headers: { authorization: `Bearer ${await token()}`, ...(cfg.conta ? { "x-conta-corrente": cfg.conta } : {}) },
  });
  if (r.status !== 200) throw new Error(`O Inter respondeu ${r.status} em ${pathname}: ${short(r)}`);
  return r.json as Record<string, unknown> | unknown[];
}

// "123.45", 123.45, "1.234,56" -> centavos (sinal preservado)
export function toCents(v: unknown): number | null {
  if (typeof v === "number") return Math.round(v * 100);
  if (typeof v !== "string") return null;
  let s = v.replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export async function interSaldo() {
  const j = (await get("/banking/v2/saldo")) as Record<string, unknown>;
  const cents = toCents(j.disponivel ?? j.saldo ?? j.valor);
  if (cents == null) throw new Error(`Resposta de saldo inesperada: ${JSON.stringify(j).slice(0, 200)}`);
  return cents;
}

export type InterEntry = { extKey: string; date: string; type: "entrada" | "saida"; amountCents: number; description: string };

// Lê a resposta do extrato (aceita {transacoes|movimentacoes: [...]} ou uma lista direta) e normaliza.
export function normalizeExtrato(json: unknown): InterEntry[] {
  const root = json as Record<string, unknown> | unknown[] | null;
  const list = (Array.isArray(root) ? root : ((root?.transacoes ?? root?.movimentacoes ?? []) as unknown[])) as Record<string, unknown>[];
  const seen = new Map<string, number>();
  const out: InterEntry[] = [];
  for (const t of list) {
    const cents = toCents(t.valor);
    const date = String(t.dataEntrada ?? t.dataInclusao ?? t.data ?? "").slice(0, 10);
    if (cents == null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const op = String(t.tipoOperacao ?? "").toUpperCase();
    const type: "entrada" | "saida" = op === "C" ? "entrada" : op === "D" ? "saida" : cents >= 0 ? "entrada" : "saida";
    const description = [t.titulo, t.descricao].filter(Boolean).map(String).join(" · ").slice(0, 200);
    const base = `${date}|${String(t.tipoTransacao ?? t.tipo ?? "")}|${type}|${Math.abs(cents)}|${description}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ extKey: `${base}#${n}`, date, type, amountCents: Math.abs(cents), description });
  }
  return out;
}

// Extrato de um período (o Inter limita a ~90 dias por consulta).
export async function interExtrato(inicio: string, fim: string): Promise<InterEntry[]> {
  return normalizeExtrato(await get("/banking/v2/extrato", { dataInicio: inicio, dataFim: fim }));
}
