"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Senha atual
        <input name="current" type="password" autoComplete="current-password" required className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nova senha (mín. 10 caracteres)
        <input name="next" type="password" autoComplete="new-password" minLength={10} required className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-neg">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-pos">
          {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Aguarde..." : "Trocar senha"}
      </button>
    </form>
  );
}
