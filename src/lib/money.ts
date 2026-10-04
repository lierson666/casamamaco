const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatBRL = (cents: number) => brl.format(cents / 100);

// Aceita "1.234,56", "1234,56", "12,5", "12.50" e "R$ 8". Devolve centavos ou null.
export function parseBRL(input: string): number | null {
  let s = input.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  // "1.000" e "1.234.567" são milhares (jeito brasileiro); "12.50" continua sendo decimal.
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 && cents < 1_000_000_000 ? cents : null;
}

// Centavos -> texto para campo de formulário ("1234,56"), sem símbolo.
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");

// Como parseBRL, mas aceita zero e valor negativo (ex.: saldo inicial de uma conta).
export function parseSignedBRL(input: string): number | null {
  const s = input.trim();
  const minus = (s.match(/-/g) ?? []).length;
  if (minus > 1) return null;
  const negative = minus === 1;
  if (negative && !/^(R\$\s*)?-[^-]/.test(s)) return null; // o "-" precisa vir antes do número
  const abs = s.replace("-", "").trim();
  if (/^(R\$)?\s*0([.,]0{1,2})?$/.test(abs)) return 0;
  const cents = parseBRL(abs);
  return cents === null ? null : negative ? -cents : cents;
}
