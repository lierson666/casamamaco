// Carimbo de status (o toque de assinatura do app): inclinado, tinta forte, como borracha de cartório.
export function Stamp({ tone, children }: { tone: "pago" | "atraso" | "hoje" | "quitada"; children: React.ReactNode }) {
  return <span className={`stamp stamp-${tone}`}>{children}</span>;
}
