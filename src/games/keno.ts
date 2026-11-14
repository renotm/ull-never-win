import type { GameDef, Rank } from './types';

/**
 * Gains fixes pour 1 € de mise, selon le nombre de numéros cochés.
 * PRIZES[cochés] = [ [bons numéros, gain], … ] du meilleur au moins bon.
 * Source : règlement Keno (FDJ, mars 2026).
 */
const PRIZES: Record<number, [number, number][]> = {
  10: [[10, 200_000], [9, 2_000], [8, 150], [7, 15], [6, 5], [5, 2], [0, 2]],
  9: [[9, 30_000], [8, 100], [7, 25], [6, 8], [5, 2], [0, 2], [4, 1]],
  8: [[8, 8_000], [7, 100], [6, 30], [5, 5], [0, 2]],
  7: [[7, 3_000], [6, 90], [5, 5], [4, 2]],
  6: [[6, 900], [5, 30], [4, 3]],
  5: [[5, 80], [4, 10], [3, 2]],
  4: [[4, 70], [3, 3]],
};

export const keno: GameDef = {
  id: 'keno',
  name: 'Keno',
  tagline: '16 numéros tirés sur 56 · 4 à 10 numéros à cocher · tous les jours à 20h',
  color: '#b94c14',
  pools: [{ key: 'numbers', label: 'Numéros', size: 56, drawCount: 16, playerChooses: true, ballStyle: 'main' }],
  pickCounts: [10],
  pickRange: [4, 10],
  stakes: [1, 2, 3, 5, 10],
  prizeScalesWithStake: true,
  drawOptions: [
    {
      id: 'soir',
      label: 'Tous les jours à 20h',
      slots: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, hour: 20, minute: 0 })),
    },
  ],
  ranks: ({ picks }): Rank[] =>
    PRIZES[picks].map(([hits, prize], i) => ({
      label: hits === 0 ? 'Aucun bon numéro' : `${hits} bon${hits > 1 ? 's' : ''} numéro${hits > 1 ? 's' : ''} sur ${picks}`,
      matches: [[hits]],
      prize,
      prizeNote:
        i === 0 && picks === 10
          ? '200 000 € pour 1 € misé, ou 10 000 € par an à vie (2 M€ ou 100 000 €/an pour 10 € misés).'
          : undefined,
    })),
  sources: ['Règlement du Keno (FDJ, mars 2026) : gains fixes, proportionnels à la mise'],
};
