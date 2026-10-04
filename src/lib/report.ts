import { shiftMonth } from "./dates";

// Os n meses que terminam em endMonth, do mais antigo ao mais novo.
export const lastMonths = (endMonth: string, n: number) => Array.from({ length: n }, (_, i) => shiftMonth(endMonth, i - (n - 1)));

export type MonthRow = { month: string; type: "entrada" | "saida"; cents: number };
export type MonthPoint = { month: string; entradas: number; saidas: number };

// Soma entradas e saídas por mês; meses sem movimento ficam com zero; meses fora da janela são ignorados.
export function seriesByMonth(rows: MonthRow[], months: string[]): MonthPoint[] {
  const out = new Map<string, MonthPoint>(months.map((m) => [m, { month: m, entradas: 0, saidas: 0 }]));
  for (const r of rows) {
    const p = out.get(r.month);
    if (!p) continue;
    if (r.type === "entrada") p.entradas += r.cents;
    else p.saidas += r.cents;
  }
  return months.map((m) => out.get(m)!);
}

export type Share = { name: string; cents: number; pct: number };

// Fatias para gráfico de rosca: maiores primeiro, excedente do topo agrupado em "Outras", e percentuais
// inteiros que sempre somam 100 (método do maior resto).
export function shares(items: { name: string; cents: number }[], top = 6): Share[] {
  const positive = items.filter((i) => i.cents > 0).sort((a, b) => b.cents - a.cents);
  if (positive.length === 0) return [];
  const head = positive.slice(0, top);
  const rest = positive.slice(top).reduce((s, i) => s + i.cents, 0);
  const list = rest > 0 ? [...head, { name: "Outras", cents: rest }] : head;

  const total = list.reduce((s, i) => s + i.cents, 0);
  const raw = list.map((i) => (i.cents * 100) / total);
  const pcts = raw.map(Math.floor);
  let left = 100 - pcts.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
    .forEach(({ i }) => {
      if (left > 0) {
        pcts[i]++;
        left--;
      }
    });
  return list.map((it, i) => ({ name: it.name, cents: it.cents, pct: pcts[i] }));
}

// Diferença e variação percentual entre dois valores; sem base de comparação, sem percentual.
export function delta(current: number, previous: number): { diff: number; pct: number | null } {
  return { diff: current - previous, pct: previous === 0 ? null : Math.round(((current - previous) * 100) / previous) };
}

export type Change = { name: string; diff: number; pct: number | null };

// Categorias que mais mudaram em relação ao mês anterior (variação absoluta), sem as que ficaram iguais.
export function topChanges(current: Map<string, number>, previous: Map<string, number>, limit = 3): Change[] {
  const names = new Set([...current.keys(), ...previous.keys()]);
  return [...names]
    .map((name) => ({ name, ...delta(current.get(name) ?? 0, previous.get(name) ?? 0) }))
    .filter((c) => c.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}
