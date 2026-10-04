import { arcPath, donutArcs, niceMax } from "@/lib/charts";
import { monthShort } from "@/lib/dates";
import { formatBRL, formatCompact } from "@/lib/money";
import type { MonthPoint, Share } from "@/lib/report";

export const swatch = (i: number) => `var(--c${(i % 8) + 1})`;

// Rosca com a legenda ao lado (a legenda também serve de texto alternativo do gráfico).
export function DonutChart({ slices, centerTop, centerBottom }: { slices: Share[]; centerTop: string; centerBottom?: string }) {
  if (slices.length === 0) return <p className="text-sm text-muted">Sem gastos neste mês ainda.</p>;
  const arcs = donutArcs(slices.map((s) => s.cents));
  const summary = slices.map((s) => `${s.name} ${s.pct}%`).join(", ");
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0" role="img" aria-label={`Gastos por categoria: ${summary}`}>
        {arcs.map((a, i) =>
          a.fraction > 0 ? (
            <path key={slices[i].name} d={arcPath(80, 80, 72, 46, a.start, a.end)} fill={swatch(i)} fillRule="evenodd" stroke="var(--surface)" strokeWidth={2} />
          ) : null,
        )}
        <text x="80" y={centerBottom ? 78 : 86} textAnchor="middle" className="fill-current font-display" fontSize="17">
          {centerTop}
        </text>
        {centerBottom && (
          <text x="80" y="96" textAnchor="middle" className="fill-current" fontSize="9" opacity="0.65">
            {centerBottom}
          </text>
        )}
      </svg>
      <ul className="w-full min-w-0 flex-1 text-sm">
        {slices.map((s, i) => (
          <li key={s.name} className="flex items-center justify-between gap-3 py-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm border border-line" style={{ background: swatch(i) }} aria-hidden />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatBRL(s.cents)} <span className="text-muted">· {s.pct}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Barras agrupadas: entradas e saídas dos últimos meses.
export function BarsChart({ data }: { data: MonthPoint[] }) {
  const W = 600;
  const H = 230;
  const L = 56; // margem do eixo
  const B = 26; // rótulos do mês
  const T = 10;
  const max = niceMax(Math.max(...data.flatMap((d) => [d.entradas, d.saidas]), 0));
  if (max === 0) return <p className="text-sm text-muted">Ainda não há movimentos para desenhar.</p>;

  const plotH = H - B - T;
  const slot = (W - L - 8) / data.length;
  const bw = Math.min(26, slot / 3);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
  const summary = data.map((d) => `${monthShort(d.month)}: entradas ${formatBRL(d.entradas)}, saídas ${formatBRL(d.saidas)}`).join("; ");

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Entradas e saídas por mês. ${summary}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 4} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={t === 0 ? 1.2 : 0.5} opacity={t === 0 ? 0.6 : 0.35} />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="10" className="fill-current" opacity="0.65">
              {formatCompact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + slot * i + slot / 2;
          return (
            <g key={d.month}>
              <rect x={cx - bw - 1} y={y(d.entradas)} width={bw} height={Math.max(0, T + plotH - y(d.entradas))} fill="var(--pos)" rx={2} />
              <rect x={cx + 1} y={y(d.saidas)} width={bw} height={Math.max(0, T + plotH - y(d.saidas))} fill="var(--accent)" rx={2} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" className="fill-current">
                {monthShort(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--pos)" }} aria-hidden /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--accent)" }} aria-hidden /> Saídas
        </span>
      </figcaption>
    </figure>
  );
}
