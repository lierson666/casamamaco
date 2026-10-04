import { describe, expect, it } from "vitest";
import { projectPayoff } from "../debt-plan";

const d = (id: number, creditor: string, remainingCents: number) => ({ id, creditor, remainingCents });

describe("projectPayoff (menor saldo primeiro)", () => {
  it("quita a menor primeiro e a sobra do mês vai para a próxima", () => {
    const plan = projectPayoff([d(2, "B", 300_000), d(1, "A", 100_000)], 200_000, "2026-10");
    const [a, b] = plan.rows;
    expect(a.creditor).toBe("A");
    expect(a.payoffMonth).toBe("2026-10"); // 1000 de 2000
    expect(b.creditor).toBe("B");
    expect(b.payoffMonth).toBe("2026-11"); // 1000 no mês 1 + 2000 no mês 2
    expect(plan.endMonth).toBe("2026-11");
  });

  it("uma dívida só: 16.400 a 1.000 por mês termina no 17º mês", () => {
    const plan = projectPayoff([d(1, "Rolandinho", 1_640_000)], 100_000, "2026-10");
    expect(plan.rows[0].payoffMonth).toBe("2028-02");
    expect(plan.rows[0].monthsToPay).toBe(17);
  });

  it("empate de saldo desempata pelo id (ordem estável)", () => {
    const plan = projectPayoff([d(5, "Y", 100), d(3, "X", 100)], 100, "2026-10");
    expect(plan.rows.map((r) => r.creditor)).toEqual(["X", "Y"]);
  });

  it("sem valor mensal não há previsão", () => {
    const plan = projectPayoff([d(1, "A", 100_000)], 0, "2026-10");
    expect(plan.rows[0].payoffMonth).toBeNull();
    expect(plan.endMonth).toBeNull();
  });

  it("dívida já quitada fica marcada e não consome o orçamento", () => {
    const plan = projectPayoff([d(1, "Paga", 0), d(2, "Aberta", 50_000)], 50_000, "2026-10");
    const paga = plan.rows.find((r) => r.creditor === "Paga")!;
    expect(paga.paid).toBe(true);
    expect(paga.payoffMonth).toBeNull();
    expect(plan.rows.find((r) => r.creditor === "Aberta")!.payoffMonth).toBe("2026-10");
  });

  it("não roda para sempre quando o valor mensal é ínfimo", () => {
    const plan = projectPayoff([d(1, "Enorme", 100_000_000)], 1, "2026-10", 24);
    expect(plan.rows[0].payoffMonth).toBeNull();
    expect(plan.endMonth).toBeNull();
  });

  it("o total pago somado ao longo dos meses fecha com o saldo", () => {
    const plan = projectPayoff([d(1, "A", 123_456), d(2, "B", 654_321)], 77_777, "2026-10");
    const total = plan.schedule.reduce((s, m) => s + m.paidCents, 0);
    expect(total).toBe(123_456 + 654_321);
  });
});
