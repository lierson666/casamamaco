import { describe, expect, it } from "vitest";
import { delta, lastMonths, seriesByMonth, shares, topChanges } from "../report";

describe("lastMonths", () => {
  it("devolve os n meses terminando no informado, do mais antigo ao mais novo", () => {
    expect(lastMonths("2026-10", 3)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(lastMonths("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("seriesByMonth", () => {
  const rows = [
    { month: "2026-09", type: "saida" as const, cents: 1000 },
    { month: "2026-09", type: "saida" as const, cents: 500 },
    { month: "2026-09", type: "entrada" as const, cents: 7000 },
    { month: "2026-10", type: "saida" as const, cents: 200 },
    { month: "2025-01", type: "saida" as const, cents: 99999 }, // fora da janela
  ];
  it("soma entradas e saídas por mês e preenche meses vazios com zero", () => {
    expect(seriesByMonth(rows, ["2026-08", "2026-09", "2026-10"])).toEqual([
      { month: "2026-08", entradas: 0, saidas: 0 },
      { month: "2026-09", entradas: 7000, saidas: 1500 },
      { month: "2026-10", entradas: 0, saidas: 200 },
    ]);
  });
});

describe("shares", () => {
  const items = [
    { name: "Mercado", cents: 5000 },
    { name: "Lazer", cents: 2000 },
    { name: "Saúde", cents: 1500 },
    { name: "Pets", cents: 1000 },
    { name: "Zero", cents: 0 },
    { name: "Negativo", cents: -50 },
  ];
  it("ordena do maior ao menor e ignora zero e negativo", () => {
    const s = shares(items, 10);
    expect(s.map((x) => x.name)).toEqual(["Mercado", "Lazer", "Saúde", "Pets"]);
  });
  it("agrupa o excedente do topo em 'Outras'", () => {
    const s = shares(items, 2);
    expect(s.map((x) => x.name)).toEqual(["Mercado", "Lazer", "Outras"]);
    expect(s[2].cents).toBe(2500);
  });
  it("os percentuais são inteiros e somam sempre 100", () => {
    for (const top of [1, 2, 3, 10]) {
      const s = shares(items, top);
      expect(s.every((x) => Number.isInteger(x.pct))).toBe(true);
      expect(s.reduce((a, b) => a + b.pct, 0)).toBe(100);
    }
    const thirds = shares([{ name: "a", cents: 1 }, { name: "b", cents: 1 }, { name: "c", cents: 1 }]);
    expect(thirds.reduce((a, b) => a + b.pct, 0)).toBe(100);
  });
  it("sem dados, lista vazia", () => {
    expect(shares([])).toEqual([]);
    expect(shares([{ name: "x", cents: 0 }])).toEqual([]);
  });
});

describe("delta", () => {
  it("diferença e variação percentual", () => {
    expect(delta(150, 100)).toEqual({ diff: 50, pct: 50 });
    expect(delta(0, 100)).toEqual({ diff: -100, pct: -100 });
  });
  it("sem base de comparação, sem percentual", () => {
    expect(delta(100, 0)).toEqual({ diff: 100, pct: null });
    expect(delta(0, 0)).toEqual({ diff: 0, pct: null });
  });
});

describe("topChanges (maiores variações por categoria)", () => {
  const current = new Map([["Mercado", 90_000], ["Lazer", 10_000], ["Pets", 30_000], ["Saúde", 0]]);
  const previous = new Map([["Mercado", 60_000], ["Lazer", 40_000], ["Pets", 30_000], ["Saúde", 5_000]]);

  it("ordena pela maior variação absoluta e ignora quem não mudou", () => {
    const c = topChanges(current, previous, 5);
    expect(c.map((x) => x.name)).toEqual(["Lazer", "Mercado", "Saúde"]);
    expect(c[0]).toEqual({ name: "Lazer", diff: -30_000, pct: -75 });
    expect(c[1]).toEqual({ name: "Mercado", diff: 30_000, pct: 50 });
  });
  it("respeita o limite", () => {
    expect(topChanges(current, previous, 1)).toHaveLength(1);
  });
  it("categoria nova no mês (sem base) vem sem percentual", () => {
    const c = topChanges(new Map([["Pets", 10_000]]), new Map(), 3);
    expect(c).toEqual([{ name: "Pets", diff: 10_000, pct: null }]);
  });
});
