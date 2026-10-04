"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

// Formulário genérico para Server Actions, com mensagem de erro/sucesso.
export function ActionForm({
  action,
  submit,
  children,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "grid gap-3 sm:grid-cols-2"}>
      {children}
      <div className="flex flex-col gap-2 sm:col-span-2">
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
        <button type="submit" disabled={pending} className="btn self-start">
          {pending ? "Aguarde..." : submit}
        </button>
      </div>
    </form>
  );
}
