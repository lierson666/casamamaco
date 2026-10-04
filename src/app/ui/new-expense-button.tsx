"use client";

import { Icon } from "./icons";
import { NEW_EXPENSE_EVENT } from "./nav";

// Botão "+ Adicionar gasto": abre a folha de novo gasto de qualquer tela.
export function NewExpenseButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(NEW_EXPENSE_EVENT))}
      className={`btn inline-flex items-center justify-center gap-2 ${className ?? ""}`}
    >
      <Icon name="novo" className="size-5" />
      Adicionar gasto
    </button>
  );
}
