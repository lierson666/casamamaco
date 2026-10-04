import { describe, expect, it } from "vitest";
import { addDays, dueDateFor, formatDay, isMonth, monthLabel, shiftMonth } from "../dates";

describe("shiftMonth", () => {
  it("avança e volta atravessando o ano", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 16)).toBe("2028-02");
  });
});

describe("isMonth", () => {
  it("aceita só AAAA-MM válido", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("26-10")).toBe(false);
    expect(isMonth(undefined)).toBe(false);
  });
});

describe("dueDateFor", () => {
  it("usa o dia pedido", () => {
    expect(dueDateFor("2026-10", 7)).toBe("2026-10-07");
  });
  it("dia 31 em mês curto vira o último dia", () => {
    expect(dueDateFor("2026-02", 31)).toBe("2026-02-28");
    expect(dueDateFor("2028-02", 31)).toBe("2028-02-29");
    expect(dueDateFor("2026-04", 31)).toBe("2026-04-30");
  });
  it("sem dia, sem vencimento", () => {
    expect(dueDateFor("2026-10", null)).toBeNull();
  });
});

describe("rótulos", () => {
  it("monthLabel em português", () => {
    expect(monthLabel("2026-10")).toBe("outubro de 2026");
  });
  it("formatDay", () => {
    expect(formatDay("2026-10-07")).toBe("07/10");
  });
});

describe("addDays", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(addDays("2026-10-04", 7)).toBe("2026-10-11");
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
