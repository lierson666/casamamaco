// Lista os códigos de recuperação (aparecem uma única vez).
export function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Guarde estes <b className="text-ink">{codes.length} códigos</b> num lugar seguro (foto, papel, gerenciador de senhas). Cada um vale{" "}
        <b className="text-ink">uma vez</b> e entra no lugar do código do app se você perder o celular. Eles não aparecem de novo.
      </p>
      <ul className="card grid grid-cols-2 gap-x-4 gap-y-2 p-4 font-mono text-base tracking-wider">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
