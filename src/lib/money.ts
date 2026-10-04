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
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 && cents < 1_000_000_000 ? cents : null;
}

// Centavos -> texto para campo de formulário ("1234,56"), sem símbolo.
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
