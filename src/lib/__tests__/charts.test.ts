import { describe, expect, it } from "vitest";
import { arcPath, donutArcs, niceMax } from "../charts";

describe("donutArcs", () => {
  it("cada fatia ocupa a sua fração, em sentido horário a partir do topo", () => {
    const arcs = donutArcs([1, 1, 2]);
    expect(arcs.map((a) => a.fraction)).toEqual([0.25, 0.25, 0.5]);
    expect(arcs[0].start).toBeCloseTo(-Math.PI / 2);
    expect(arcs[2].end).toBeCloseTo(-Math.PI / 2 + 2 * Math.PI);
    expect(arcs[1].start).toBeCloseTo(arcs[0].end);
  });
  it("sem valores positivos, não há fatias", () => {
    expect(donutArcs([])).toEqual([]);
    expect(donutArcs([0, 0])).toEqual([]);
  });
});

describe("arcPath", () => {
  it("fatia comum é um anel fechado", () => {
    const d = arcPath(50, 50, 40, 25, -Math.PI / 2, 0);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d).not.toContain("NaN");
  });
  it("fatia de 100% vira anel completo (dois arcos por borda)", () => {
    const d = arcPath(50, 50, 40, 25, -Math.PI / 2, (3 * Math.PI) / 2);
    expect((d.match(/A/g) ?? []).length).toBe(4);
    expect(d).not.toContain("NaN");
  });
});

describe("niceMax", () => {
  it.each([
    [7300, 10000],
    [4200, 5000],
    [1800, 2000],
    [100, 100],
    [101, 200],
    [0, 0],
  ])("escala do eixo para %d é %d", (v, expected) => {
    expect(niceMax(v)).toBe(expected);
  });
});
