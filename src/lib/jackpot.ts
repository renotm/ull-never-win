import type { GameDef, GridSettings } from '../games/types';
import { rankProbability } from './odds';

/** Probabilité, à chaque tirage, qu'au moins une des grilles gagne le rang 1. */
export function jackpotProbability(game: GameDef, grids: { settings: GridSettings }[]): number {
  const logMiss = grids.reduce(
    (s, g) => s + Math.log1p(-rankProbability(game, g.settings, game.ranks(g.settings)[0])),
    0,
  );
  return -Math.expm1(logMiss);
}

/** Probabilité d'avoir touché le rang 1 au moins une fois en n tirages. */
export function probabilityWithin(pPerDraw: number, n: number): number {
  return -Math.expm1(n * Math.log1p(-pPerDraw));
}

/** Vitesse approximative du moteur, pour estimer les temps de calcul. */
export const ENGINE_DRAWS_PER_SECOND = 5_000_000;
