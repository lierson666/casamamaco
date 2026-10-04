const TZ = "America/Sao_Paulo";

// "YYYY-MM-DD" de hoje no fuso de São Paulo (o servidor roda em UTC).
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

export const currentMonth = () => today().slice(0, 7);

export const isMonth = (s: string | undefined): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const formatDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Vencimento do mês; dia 31 em mês de 30 dias vira o último dia.
export function dueDateFor(month: string, day: number | null) {
  if (!day) return null;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

// Soma (ou subtrai) dias a uma data "AAAA-MM-DD".
export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
