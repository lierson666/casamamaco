import { shiftMonth } from "./dates";

export type DebtIn = { id: number; creditor: string; remainingCents: number };
export type PlanRow = DebtIn & { paid: boolean; payoffMonth: string | null; monthsToPay: number | null };
export type Plan = {
  rows: PlanRow[];
  endMonth: string | null;
  schedule: { month: string; paidCents: number }[];
};

// Plano de quitação "bola de neve": todo mês, o valor fixo vai para a dívida de menor saldo; o que
// sobra do mês passa para a próxima. Devolve a ordem, o mês em que cada uma acaba e o fim do plano.
export function projectPayoff(debts: DebtIn[], monthlyCents: number, startMonth: string, maxMonths = 600): Plan {
  const rows: PlanRow[] = [...debts]
    .sort((a, b) => a.remainingCents - b.remainingCents || a.id - b.id)
    .map((d) => ({ ...d, paid: d.remainingCents <= 0, payoffMonth: null, monthsToPay: null }));
  const remaining = rows.map((r) => Math.max(0, r.remainingCents));
  const schedule: Plan["schedule"] = [];

  if (monthlyCents > 0) {
    for (let m = 0; m < maxMonths && remaining.some((x) => x > 0); m++) {
      let budget = monthlyCents;
      let paidCents = 0;
      for (let i = 0; i < rows.length && budget > 0; i++) {
        if (remaining[i] <= 0) continue;
        const pay = Math.min(budget, remaining[i]);
        remaining[i] -= pay;
        budget -= pay;
        paidCents += pay;
        if (remaining[i] === 0 && rows[i].payoffMonth === null) {
          rows[i].payoffMonth = shiftMonth(startMonth, m);
          rows[i].monthsToPay = m + 1;
        }
      }
      schedule.push({ month: shiftMonth(startMonth, m), paidCents });
    }
  }

  const open = rows.filter((r) => !r.paid);
  const finished = open.length > 0 && open.every((r) => r.payoffMonth !== null);
  const endMonth = finished ? open.map((r) => r.payoffMonth!).sort().at(-1)! : null;
  return { rows, endMonth, schedule };
}
