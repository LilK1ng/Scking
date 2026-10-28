// Caché en memoria con vencimiento. Si dos pedidos iguales llegan a la vez,
// comparten una sola llamada a la API (evita gastar el límite de uso).
const store = new Map();
const pending = new Map();

export function cached(key, ttlMs, loader) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  if (pending.has(key)) return pending.get(key);

  const p = Promise.resolve()
    .then(loader)
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
