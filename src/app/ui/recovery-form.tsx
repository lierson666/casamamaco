"use client";

import { useActionState } from "react";
import { regenerateRecovery } from "@/app/actions/auth";
import { RecoveryCodes } from "./recovery-codes";

export function RecoveryForm() {
  const [state, action, pending] = useActionState(regenerateRecovery, undefined);
  if (state?.codes) return <RecoveryCodes codes={state.codes} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">Gere 8 códigos novos. Os antigos deixam de valer. Confirme com o código atual do app.</p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Código do autenticador
        <input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" className="field tabular-nums tracking-[0.2em]" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-neg">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn self-start">
        {pending ? "Aguarde..." : "Gerar novos códigos"}
      </button>
    </form>
  );
}
