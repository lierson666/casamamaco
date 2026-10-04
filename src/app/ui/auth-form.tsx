"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  withName?: boolean;
};

export function AuthForm({ action, submitLabel, withName }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {withName && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nome
          <input name="name" autoComplete="name" required className="field" />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        E-mail
        <input name="email" type="email" autoComplete="email" required className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Senha
        <input
          name="password"
          type="password"
          autoComplete={withName ? "new-password" : "current-password"}
          minLength={8}
          required
          className="field"
        />
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
        {pending ? "Aguarde..." : submitLabel}
      </button>
    </form>
  );
}
