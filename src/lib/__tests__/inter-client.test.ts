import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Servidor "Inter de mentira": confere o OAuth e o Bearer, devolve saldo e extrato.
let server: http.Server;
let tmp: string;
const seen: { path: string; auth?: string; conta?: string }[] = [];
let inter: typeof import("../inter");

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url!, "http://x");
    seen.push({ path: url.pathname + url.search, auth: req.headers.authorization, conta: req.headers["x-conta-corrente"] as string | undefined });
    const send = (code: number, body: unknown) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === "/oauth/v2/token" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const p = new URLSearchParams(body);
        const ok = p.get("client_id") === "meu-client-id" && p.get("client_secret") === "meu-client-secret" && p.get("grant_type") === "client_credentials" && p.get("scope") === "extrato.read";
        return ok ? send(200, { access_token: "tok-123", expires_in: 3600 }) : send(400, { error: "invalid_client" });
      });
      return;
    }
    if (req.headers.authorization !== "Bearer tok-123") return send(401, { title: "Nao autorizado" });
    if (url.pathname === "/banking/v2/saldo") return send(200, { disponivel: 1234.56 });
    if (url.pathname === "/banking/v2/extrato") {
      return send(200, { transacoes: [{ dataEntrada: "2026-10-02", tipoOperacao: "D", valor: "150.50", titulo: "Pix enviado" }] });
    }
    return send(404, { title: "nao existe" });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;

  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inter-test-"));
  process.env.DATABASE_PATH = path.join(tmp, "casa.db"); // segredos vão para <tmp>/secrets/inter
  process.env.INTER_BASE_URL = `http://127.0.0.1:${port}`; // http: sem mTLS, só no teste
  inter = await import("../inter");
});

afterAll(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("cliente do Inter", () => {
  it("sem credenciais salvas, avisa", async () => {
    expect(inter.interConfigured()).toBe(false);
    await expect(inter.interSaldo()).rejects.toThrow(/não configurada/);
  });

  it("salva segredos só para o dono (modo 600)", () => {
    inter.saveInterSecrets({ clientId: "meu-client-id", clientSecret: "meu-client-secret", conta: "12345", cert: "CERT", key: "KEY" });
    expect(inter.interConfigured()).toBe(true);
    const dir = path.join(tmp, "secrets", "inter");
    for (const f of fs.readdirSync(dir)) expect(fs.statSync(path.join(dir, f)).mode & 0o777).toBe(0o600);
  });

  it("pega o token (escopo extrato.read) e lê o saldo em centavos", async () => {
    expect(await inter.interSaldo()).toBe(123456);
    const saldo = seen.find((s) => s.path.startsWith("/banking/v2/saldo"))!;
    expect(saldo.auth).toBe("Bearer tok-123");
    expect(saldo.conta).toBe("12345");
  });

  it("lê o extrato do período", async () => {
    const out = await inter.interExtrato("2026-10-01", "2026-10-31");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "saida", amountCents: 15050 });
    expect(seen.at(-1)!.path).toContain("dataInicio=2026-10-01");
    expect(seen.at(-1)!.path).toContain("dataFim=2026-10-31");
  });

  it("reaproveita o token (só uma chamada ao OAuth)", () => {
    expect(seen.filter((s) => s.path === "/oauth/v2/token").length).toBe(1);
  });

  it("credencial errada vira erro claro", async () => {
    inter.saveInterSecrets({ clientId: "errado", clientSecret: "errado", cert: "CERT", key: "KEY" });
    await expect(inter.interSaldo()).rejects.toThrow(/recusou o acesso \(400\)/);
  });
});
