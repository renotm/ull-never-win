/**
 * Générateur de hasard basé sur crypto.getRandomValues, avec tampon
 * pour limiter le nombre d'appels.
 */
const BUFFER_SIZE = 16384; // 64 Ko, limite de getRandomValues
const buffer = new Uint32Array(BUFFER_SIZE);
let cursor = BUFFER_SIZE;

function nextUint32(): number {
  if (cursor >= BUFFER_SIZE) {
    crypto.getRandomValues(buffer);
    cursor = 0;
  }
  return buffer[cursor++];
}

/** Entier uniforme dans [0, n), sans biais (rejet). */
export function randomInt(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n;
  let x = nextUint32();
  while (x >= limit) x = nextUint32();
  return x % n;
}

/** Réel uniforme dans [0, 1), 53 bits de précision. */
export function randomFloat(): number {
  return ((nextUint32() >>> 5) * 67108864 + (nextUint32() >>> 6)) / 9007199254740992;
}

/** Loi normale centrée réduite (Box-Muller). */
export function randomGaussian(): number {
  let u = 0;
  while (u === 0) u = randomFloat();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * randomFloat());
}

/** Loi de Poisson de moyenne `mean` (petite moyenne, inversion). */
function randomPoisson(mean: number): number {
  let k = 0;
  let p = Math.exp(-mean);
  let s = p;
  const u = randomFloat();
  while (u > s && k < 1000) {
    k++;
    p *= mean / k;
    s += p;
  }
  return k;
}

/**
 * Loi binomiale B(n, p), pour n pouvant atteindre plusieurs milliers de milliards.
 * - n petit : simulation directe ;
 * - moyenne faible : approximation de Poisson (excellente quand p est petit) ;
 * - sinon : approximation normale (n·p·(1-p) ≥ 30).
 */
export function randomBinomial(n: number, p: number): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (p > 0.5) return n - randomBinomial(n, 1 - p);
  if (n < 50) {
    let k = 0;
    for (let i = 0; i < n; i++) if (randomFloat() < p) k++;
    return k;
  }
  const mean = n * p;
  if (mean < 30) return Math.min(n, randomPoisson(mean));
  const k = Math.round(mean + Math.sqrt(mean * (1 - p)) * randomGaussian());
  return Math.max(0, Math.min(n, k));
}

/**
 * Tire `count` éléments distincts dans `pool` par Fisher-Yates partiel.
 * Les `count` premières cases de `pool` contiennent le résultat.
 * Le tableau n'a pas besoin d'être réinitialisé entre deux tirages :
 * permuter une permutation quelconque donne toujours un tirage uniforme.
 */
export function partialShuffle(pool: Int32Array | number[], count: number): void {
  const n = pool.length;
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(n - i);
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
}

/** Choisit `count` numéros entre 1 et size, en excluant ceux de `exclude`. */
export function pickRandom(size: number, count: number, exclude: number[] = []): number[] {
  const available: number[] = [];
  for (let v = 1; v <= size; v++) if (!exclude.includes(v)) available.push(v);
  const k = Math.min(count, available.length);
  partialShuffle(available, k);
  return available.slice(0, k);
}
