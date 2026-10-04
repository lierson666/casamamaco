// Geometria dos gráficos (SVG feito no servidor, sem biblioteca).

const TOP = -Math.PI / 2;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// Ângulos de cada fatia, em sentido horário a partir do topo.
export function donutArcs(values: number[]): { start: number; end: number; fraction: number }[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return [];
  let angle = TOP;
  return values.map((v) => {
    const fraction = v > 0 ? v / total : 0;
    const start = angle;
    angle += fraction * 2 * Math.PI;
    return { start, end: angle, fraction };
  });
}

// Fatia de anel (rosca). Fatia de 100% vira anel completo (usar fill-rule="evenodd").
export function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const pt = (r: number, a: number) => `${r3(cx + r * Math.cos(a))} ${r3(cy + r * Math.sin(a))}`;
  if (end - start >= 2 * Math.PI - 1e-6) {
    const ring = (r: number, sweep: number) => `M ${r3(cx + r)} ${r3(cy)} A ${r} ${r} 0 1 ${sweep} ${r3(cx - r)} ${r3(cy)} A ${r} ${r} 0 1 ${sweep} ${r3(cx + r)} ${r3(cy)} Z`;
    return `${ring(rOuter, 1)} ${ring(rInner, 0)}`;
  }
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${pt(rOuter, start)} A ${rOuter} ${rOuter} 0 ${large} 1 ${pt(rOuter, end)} L ${pt(rInner, end)} A ${rInner} ${rInner} 0 ${large} 0 ${pt(rInner, start)} Z`;
}

// Teto "redondo" do eixo (1, 2, 5 ou 10 vezes uma potência de 10).
export function niceMax(v: number): number {
  if (v <= 0) return 0;
  const base = 10 ** Math.floor(Math.log10(v));
  const f = v / base;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * base;
}
