export type BudgetLevel = "none" | "ok" | "warn" | "over";

// Quanto do teto já foi usado: avisa a partir de 80% e estoura a partir de 100%.
export function budgetStatus(limitCents: number | null | undefined, spentCents: number): { pct: number; level: BudgetLevel } {
  if (!limitCents || limitCents <= 0) return { pct: 0, level: "none" };
  const pct = Math.floor((spentCents * 100) / limitCents);
  return { pct, level: pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok" };
}

// Sugestão de teto: média dos 2 meses mais recentes (últimos da lista), arredondada para cima em R$ 10.
export function suggestLimit(monthlySpentCents: number[]): number | null {
  const last = monthlySpentCents.slice(-2);
  const sum = last.reduce((a, b) => a + b, 0);
  if (last.length === 0 || sum <= 0) return null;
  return Math.ceil(sum / last.length / 1000) * 1000;
}
