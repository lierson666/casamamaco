import { describe, expect, it } from "vitest";
import { centsToInput, formatBRL, parseBRL, parseSignedBRL } from "../money";

describe("parseBRL", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["12,5", 1250],
    ["12.50", 1250],
    ["R$ 8", 800],
    ["  45,00 ", 4500],
    ["1.000", 100000],
    ["1.234.567", 123456700],
  ])("lê %s como %d centavos", (input, cents) => {
    expect(parseBRL(input)).toBe(cents);
  });

  it.each(["", "0", "0,00", "-5", "abc", "1,2,3", "12,345", "R$"])("recusa %j", (input) => {
    expect(parseBRL(input)).toBeNull();
  });

  it("recusa valores absurdos (>= R$ 10 milhões)", () => {
    expect(parseBRL("10.000.000,00")).toBeNull();
  });
});

describe("formatBRL / centsToInput", () => {
  it("formata em reais", () => {
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
  it("devolve texto de campo com vírgula", () => {
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(null)).toBe("");
  });
});

describe("parseSignedBRL (saldo inicial: aceita zero e negativo)", () => {
  it.each([
    ["0", 0],
    ["0,00", 0],
    ["1.234,56", 123456],
    ["-150,00", -15000],
    ["-1.000", -100000],
    ["R$ -20,5", -2050],
  ])("lê %s como %d", (input, cents) => {
    expect(parseSignedBRL(input)).toBe(cents);
  });
  it.each(["", "abc", "--5", "1,2,3", "12,345", "-"])("recusa %j", (input) => {
    expect(parseSignedBRL(input)).toBeNull();
  });
});
