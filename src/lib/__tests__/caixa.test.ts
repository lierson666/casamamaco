import { describe, expect, it } from "vitest";
import { accountBalance, forecastBalance } from "../caixa";

describe("accountBalance", () => {
  it("saldo inicial + entradas − saídas", () => {
    expect(accountBalance(100_000, 50_000, 30_000)).toBe(120_000);
  });
  it("pode ficar negativo", () => {
    expect(accountBalance(0, 1_000, 5_000)).toBe(-4_000);
  });
});

describe("forecastBalance", () => {
  it("saldo previsto = saldo atual − contas ainda abertas do mês", () => {
    expect(forecastBalance(500_000, 504_096)).toBe(-4_096);
  });
  it("sem contas abertas, igual ao saldo atual", () => {
    expect(forecastBalance(500_000, 0)).toBe(500_000);
  });
});
