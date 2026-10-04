"use client";

import { useActionState, useEffect, useRef } from "react";
import { addExpense } from "@/app/actions/gastos";

type Option = { id: number; name: string };

export function ExpenseForm({
  categories,
  accounts,
  users,
  me,
  today,
  onSaved,
  autoFocus,
}: {
  categories: Option[];
  accounts: Option[];
  users: Option[];
  me: number;
  today: string;
  onSaved?: () => void;
  autoFocus?: boolean;
}) {
  const [state, formAction, pending] = useActionState(addExpense, undefined);
  const ref = useRef<HTMLFormElement>(null);

  // Limpa o formulário depois de salvar (a data, a conta e quem pagou voltam ao padrão).
  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.reset();
    if (!onSaved) return;
    const t = setTimeout(onSaved, 700); // deixa ver "Gasto registrado." antes de fechar
    return () => clearTimeout(t);
  }, [state, onSaved]);

  return (
    <form ref={ref} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
        O que foi o gasto?
        <input name="description" required maxLength={120} autoFocus={autoFocus} placeholder="Ex.: Mercado, farmácia, gás" className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Valor (R$)
        <input name="amount" required inputMode="decimal" placeholder="0,00" className="field tabular-nums" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Data
        <input name="date" type="date" required defaultValue={today} className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Categoria
        <select name="categoryId" required defaultValue="" className="field">
          <option value="" disabled>
            Escolha…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Saiu de qual conta?
        <select name="accountId" required defaultValue="" className="field">
          <option value="" disabled>
            Escolha…
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
        Quem pagou?
        <select name="paidBy" required defaultValue={me} className="field">
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2">
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
          {pending ? "Salvando..." : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}
