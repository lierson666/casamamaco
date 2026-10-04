import { describe, expect, it } from "vitest";
import { installmentDueDates, installmentName, splitInstallments } from "../installments";

describe("splitInstallments", () => {
  it("divide sem perder centavo (resto vai para as primeiras)", () => {
    expect(splitInstallments(10_000, 3)).toEqual([3_334, 3_333, 3_333]);
  });
  it("divisão exata", () => {
    expect(splitInstallments(9_000, 3)).toEqual([3_000, 3_000, 3_000]);
  });
  it("a soma sempre fecha com o total", () => {
    for (const [total, n] of [[123_457, 7], [1, 3], [999_999, 12]]) {
      expect(splitInstallments(total, n).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  it("recusa parcela inválida", () => {
    expect(() => splitInstallments(1000, 0)).toThrow();
    expect(() => splitInstallments(1000, 61)).toThrow();
  });
});

describe("installmentDueDates", () => {
  it("um vencimento por mês, mantendo o dia", () => {
    expect(installmentDueDates("2026-10-07", 3)).toEqual(["2026-10-07", "2026-11-07", "2026-12-07"]);
  });
  it("dia 31 cai no último dia dos meses curtos, sem deslizar", () => {
    expect(installmentDueDates("2026-01-31", 4)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
});

describe("installmentName", () => {
  it("numera 'n/N'", () => {
    expect(installmentName("IPVA", 2, 3)).toBe("IPVA (2/3)");
  });
  it("uma parcela só não ganha sufixo", () => {
    expect(installmentName("IPVA", 1, 1)).toBe("IPVA");
  });
});
