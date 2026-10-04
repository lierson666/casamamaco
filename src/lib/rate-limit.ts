// Freio simples de tentativas (em memória): máx. N falhas por chave em 15 minutos.
const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map<string, { n: number; since: number }>();

export function blocked(key: string, max = 5) {
  const h = hits.get(key);
  return !!h && Date.now() - h.since <= WINDOW_MS && h.n >= max;
}

export function fail(key: string) {
  const h = hits.get(key);
  if (!h || Date.now() - h.since > WINDOW_MS) hits.set(key, { n: 1, since: Date.now() });
  else h.n += 1;
}

export const clear = (key: string) => hits.delete(key);
