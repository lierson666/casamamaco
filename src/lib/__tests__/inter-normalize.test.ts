import { describe, expect, it } from "vitest";
import { normalizeExtrato, toCents } from "../inter";

describe("toCents", () => {
  it.each([
    ["1.234,56", 123456],
    ["150.50", 15050],
    [12.5, 1250],
    ["-20,00", -2000],
  ])("lê %j como %d", (v, cents) => expect(toCents(v)).toBe(cents));
  it.each(["abc", undefined, null, {}])("recusa %j", (v) => expect(toCents(v)).toBeNull());
});

describe("normalizeExtrato", () => {
  it("lê o formato com 'transacoes' (tipoOperacao C/D)", () => {
    const out = normalizeExtrato({
      transacoes: [
        { dataEntrada: "2026-10-02", tipoOperacao: "D", tipoTransacao: "PIX", valor: "150.50", titulo: "Pix enviado", descricao: "Fornecedor X" },
        { dataEntrada: "2026-10-03", tipoOperacao: "C", tipoTransacao: "PIX", valor: "200.00", titulo: "Pix recebido" },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ date: "2026-10-02", type: "saida", amountCents: 15050, description: "Pix enviado · Fornecedor X" });
    expect(out[1]).toMatchObject({ type: "entrada", amountCents: 20000, description: "Pix recebido" });
  });

  it("lê lista simples com valor com sinal e data com hora", () => {
    const out = normalizeExtrato([
      { data: "2026-10-05T14:03:00", valor: -99.9, descricao: "Tarifa" },
      { data: "2026-10-05", valor: 10, descricao: "Estorno" },
    ]);
    expect(out[0]).toMatchObject({ date: "2026-10-05", type: "saida", amountCents: 9990 });
    expect(out[1]).toMatchObject({ type: "entrada", amountCents: 1000 });
  });

  it("ignora linhas sem data ou sem valor", () => {
    const out = normalizeExtrato({ transacoes: [{ valor: "10.00" }, { dataEntrada: "2026-10-01" }, { dataEntrada: "2026-10-01", valor: "5.00", tipoOperacao: "C" }] });
    expect(out).toHaveLength(1);
  });

  it("linhas idênticas recebem chaves diferentes (não se perdem na deduplicação)", () => {
    const row = { dataEntrada: "2026-10-02", tipoOperacao: "D", valor: "10.00", descricao: "Café" };
    const out = normalizeExtrato({ transacoes: [row, row] });
    expect(new Set(out.map((e) => e.extKey)).size).toBe(2);
  });

  it("resposta vazia ou estranha não quebra", () => {
    expect(normalizeExtrato({})).toEqual([]);
    expect(normalizeExtrato(null)).toEqual([]);
  });
});
