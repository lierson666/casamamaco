"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  withName?: boolean;
};

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function AuthForm({ action, submitLabel, withName }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {withName && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nome
          <input name="name" autoComplete="name" required className={field} />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Senha
        <input
          name="password"
          type="password"
          autoComplete={withName ? "new-password" : "current-password"}
          minLength={8}
          required
          className={field}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {state.ok}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Aguarde..." : submitLabel}
      </button>
    </form>
  );
}
