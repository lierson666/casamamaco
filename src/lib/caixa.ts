// Saldo atual de uma conta: saldo inicial mais tudo que entrou, menos tudo que saiu.
export const accountBalance = (openingCents: number, entradasCents: number, saidasCents: number) =>
  openingCents + entradasCents - saidasCents;

// Saldo previsto: o atual menos as contas do mês ainda não pagas.
export const forecastBalance = (balanceCents: number, unpaidBillsCents: number) => balanceCents - unpaidBillsCents;
