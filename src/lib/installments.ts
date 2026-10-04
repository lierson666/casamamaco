import { dueDateFor, shiftMonth } from "./dates";

export const MAX_INSTALLMENTS = 60;

// Divide o total em n parcelas sem perder centavo (o resto vai para as primeiras).
export function splitInstallments(totalCents: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1 || n > MAX_INSTALLMENTS) throw new Error(`Parcelas devem ser de 1 a ${MAX_INSTALLMENTS}.`);
  const base = Math.floor(totalCents / n);
  const rest = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

// Um vencimento por mês, sempre a partir do dia original (31/01 -> 28/02 -> 31/03, sem deslizar).
export function installmentDueDates(firstDate: string, n: number): string[] {
  const day = Number(firstDate.slice(8, 10));
  const month = firstDate.slice(0, 7);
  return Array.from({ length: n }, (_, i) => dueDateFor(shiftMonth(month, i), day)!);
}

export const installmentName = (name: string, index: number, total: number) => (total === 1 ? name : `${name} (${index}/${total})`);
