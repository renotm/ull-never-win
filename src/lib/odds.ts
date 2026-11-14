import type { GameDef, GridSettings, Rank } from '../games/types';

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Probabilité d'avoir exactement k bons numéros en ayant coché `picked` numéros. */
export function matchProbability(size: number, drawn: number, picked: number, k: number): number {
  return (binomial(picked, k) * binomial(size - picked, drawn - k)) / binomial(size, drawn);
}

export function pickCountsFor(game: GameDef, settings: GridSettings): number[] {
  return game.pickCounts.map((c, i) => (i === 0 && game.pickRange ? settings.picks : c));
}

/** Probabilité de gagner un rang donné avec une grille. */
export function rankProbability(game: GameDef, settings: GridSettings, rank: Rank): number {
  const picks = pickCountsFor(game, settings);
  let p = 1;
  game.pools.forEach((pool, i) => {
    let pi = 0;
    for (const k of rank.matches[i]) pi += matchProbability(pool.size, pool.drawCount, picks[i], k);
    p *= pi;
  });
  return p;
}

/**
 * Table [bons numéros urne 0][bons numéros urne 1]… → indice du rang (-1 = perdu).
 * Les rangs sont testés du meilleur au moins bon : le premier qui correspond l'emporte.
 */
export function buildRankLookup(game: GameDef, settings: GridSettings): Int8Array {
  const picks = pickCountsFor(game, settings);
  const dims = picks.map((p) => p + 1);
  const total = dims.reduce((a, b) => a * b, 1);
  const lookup = new Int8Array(total).fill(-1);
  const ranks = game.ranks(settings);
  for (let idx = 0; idx < total; idx++) {
    // Décompose idx en nombre de bons numéros par urne.
    let rest = idx;
    const m: number[] = [];
    for (let d = dims.length - 1; d >= 0; d--) {
      m[d] = rest % dims[d];
      rest = Math.floor(rest / dims[d]);
    }
    const r = ranks.findIndex((rank) => rank.matches.every((ok, i) => ok.includes(m[i])));
    lookup[idx] = r;
  }
  return lookup;
}
