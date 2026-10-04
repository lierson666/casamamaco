import { describe, expect, it } from "vitest";
import { budgetStatus, suggestLimit } from "../budget";

describe("budgetStatus", () => {
  it("abaixo de 80% está ok", () => {
    expect(budgetStatus(10_000, 7_999)).toEqual({ pct: 79, level: "ok" });
  });
  it("a partir de 80% avisa", () => {
    expect(budgetStatus(10_000, 8_000)).toEqual({ pct: 80, level: "warn" });
    expect(budgetStatus(10_000, 9_999)).toEqual({ pct: 99, level: "warn" });
  });
  it("a partir de 100% estourou", () => {
    expect(budgetStatus(10_000, 10_000)).toEqual({ pct: 100, level: "over" });
    expect(budgetStatus(10_000, 12_000)).toEqual({ pct: 120, level: "over" });
  });
  it("sem teto definido não há status", () => {
    expect(budgetStatus(0, 5_000)).toEqual({ pct: 0, level: "none" });
    expect(budgetStatus(null, 5_000)).toEqual({ pct: 0, level: "none" });
  });
});

describe("suggestLimit", () => {
  it("média dos meses, arredondada para cima em R$ 10", () => {
    expect(suggestLimit([12_345, 20_000])).toBe(17_000); // média 16.172,5
    expect(suggestLimit([10_000])).toBe(10_000);
  });
  it("sem histórico (ou só zeros) não sugere", () => {
    expect(suggestLimit([])).toBeNull();
    expect(suggestLimit([0, 0])).toBeNull();
  });
  it("usa só os 2 meses mais recentes (últimos da lista)", () => {
    expect(suggestLimit([999_999, 10_000, 20_000])).toBe(15_000);
  });
});
