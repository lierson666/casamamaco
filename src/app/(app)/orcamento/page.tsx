import { eq } from "drizzle-orm";
import { setLimit, suggestLimits } from "@/app/actions/orcamento";
import { ActionForm } from "@/app/ui/action-form";
import { MonthNav } from "@/app/ui/month-nav";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { budgetStatus } from "@/lib/budget";
import { currentMonth, isMonth, monthLabel } from "@/lib/dates";
import { centsToInput, formatBRL } from "@/lib/money";
import { expenseCategories, spentByCategory } from "@/lib/queries";

export const dynamic = "force-dynamic";

const bar = { none: "bg-surface-2", ok: "bg-pos", warn: "bg-accent", over: "bg-neg" } as const;
const note = { none: "sem teto", ok: "", warn: "perto do teto", over: "estourou" } as const;

export default async function Orcamento({ searchParams }: PageProps<"/orcamento">) {
  await requireUser();
  const { mes } = await searchParams;
  const month = isMonth(typeof mes === "string" ? mes : undefined) ? (mes as string) : currentMonth();

  const limits = new Map(db.select().from(schema.budgets).where(eq(schema.budgets.month, month)).all().map((b) => [b.categoryId, b.limitCents]));
  const spent = spentByCategory(month);
  const cats = expenseCategories();

  const rows = cats.map((c) => {
    const limit = limits.get(c.id) ?? 0;
    const s = spent.get(c.id) ?? 0;
    return { ...c, limit, spent: s, status: budgetStatus(limit, s) };
  });
  const totalLimit = rows.reduce((a, r) => a + r.limit, 0);
  const totalSpentAll = [...spent.values()].reduce((a, b) => a + b, 0);
  const spentUnderLimit = rows.filter((r) => r.limit > 0).reduce((a, r) => a + r.spent, 0);
  const overall = budgetStatus(totalLimit, spentUnderLimit);
  const uncovered = totalSpentAll - spentUnderLimit;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Orçamento</h1>
          <p className="mt-0.5 text-muted first-letter:uppercase">{monthLabel(month)}</p>
        </div>
        <MonthNav base="/orcamento" month={month} />
      </header>

      <section className="card p-5">
        <h2 className="text-sm font-medium text-muted">Tetos do mês</h2>
        {totalLimit === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhum teto definido ainda. Defina por categoria abaixo, ou peça uma sugestão pelo histórico.</p>
        ) : (
          <>
            <p className="mt-1 kpi">
              {formatBRL(spentUnderLimit)} <span className="text-lg text-muted">de {formatBRL(totalLimit)}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden border border-line bg-surface-2" role="progressbar" aria-valuenow={Math.min(overall.pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Orçamento do mês">
              <div className={`h-full ${bar[overall.level]}`} style={{ width: `${Math.min(overall.pct, 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {overall.pct}% usado
              {uncovered > 0 && ` · mais ${formatBRL(uncovered)} em categorias sem teto`}
            </p>
          </>
        )}
        <div className="mt-4">
          <ActionForm action={suggestLimits} submit="Sugerir tetos pelo histórico" className="flex flex-col gap-2">
            <input type="hidden" name="month" value={month} />
            <p className="text-xs text-muted">Preenche só as categorias sem teto, com a média dos 2 meses anteriores.</p>
          </ActionForm>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Por categoria</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {r.name}
                  {note[r.status.level] && <span className={`ml-2 text-xs font-semibold ${r.status.level === "over" ? "text-neg" : "text-accent"}`}>{note[r.status.level]}</span>}
                </span>
                <span className="text-sm tabular-nums">
                  {formatBRL(r.spent)}
                  {r.limit > 0 && <span className="text-muted"> / {formatBRL(r.limit)}</span>}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden border border-line bg-surface-2" aria-hidden>
                <div className={`h-full ${bar[r.status.level]}`} style={{ width: `${Math.min(r.status.pct, 100)}%` }} />
              </div>
              <details className="mt-2">
                <summary className="btn-ghost inline-block cursor-pointer list-none text-sm">{r.limit > 0 ? "Mudar teto" : "Definir teto"}</summary>
                <div className="card mt-2 p-4">
                  <ActionForm action={setLimit} submit="Salvar teto" className="flex flex-col gap-3">
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="categoryId" value={r.id} />
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Teto de {r.name} (R$)
                      <input name="amount" inputMode="decimal" defaultValue={centsToInput(r.limit || null)} placeholder="0,00 (vazio remove)" className="field tabular-nums" />
                    </label>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
