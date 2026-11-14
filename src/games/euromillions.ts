import type { GameDef } from './types';

const slot = (weekday: number) => [{ weekday, hour: 21, minute: 5 }];

export const euromillions: GameDef = {
  id: 'euromillions',
  name: 'EuroMillions',
  tagline: '5 numéros sur 50 + 2 étoiles sur 12 · mardi, vendredi',
  color: '#1c64d1',
  pools: [
    { key: 'numbers', label: 'Numéros', size: 50, drawCount: 5, playerChooses: true, ballStyle: 'main' },
    { key: 'stars', label: 'Étoiles', size: 12, drawCount: 2, playerChooses: true, ballStyle: 'star' },
  ],
  pickCounts: [5, 2],
  stakes: [2.5],
  prizeScalesWithStake: false,
  drawOptions: [
    { id: 'mar', label: 'Mardi', slots: slot(2) },
    { id: 'ven', label: 'Vendredi', slots: slot(5) },
  ],
  ranks: () => [
    {
      label: '5 numéros + 2 étoiles',
      matches: [[5], [2]],
      prize: 93_000_000,
      average: true,
      prizeNote: 'Jackpot (17 M€ minimum, 250 M€ maximum). Moyenne des jackpots remportés depuis 2020 : environ 93 M€.',
    },
    { label: '5 numéros + 1 étoile', matches: [[5], [1]], prize: 260_000, average: true },
    { label: '5 numéros', matches: [[5], [0]], prize: 40_000, average: true },
    { label: '4 numéros + 2 étoiles', matches: [[4], [2]], prize: 1_550, average: true },
    { label: '4 numéros + 1 étoile', matches: [[4], [1]], prize: 128, average: true },
    { label: '3 numéros + 2 étoiles', matches: [[3], [2]], prize: 61, average: true },
    { label: '4 numéros', matches: [[4], [0]], prize: 42, average: true },
    { label: '2 numéros + 2 étoiles', matches: [[2], [2]], prize: 14.7, average: true },
    { label: '3 numéros + 1 étoile', matches: [[3], [1]], prize: 11.6, average: true },
    { label: '3 numéros', matches: [[3], [0]], prize: 9.5, average: true },
    { label: '1 numéro + 2 étoiles', matches: [[1], [2]], prize: 7, average: true },
    { label: '2 numéros + 1 étoile', matches: [[2], [1]], prize: 5.6, average: true },
    { label: '2 numéros', matches: [[2], [0]], prize: 4, average: true },
  ],
  sources: [
    'Règlement EuroMillions – My Million (FDJ, mars 2025)',
    'Gains moyens calculés sur les résultats officiels FDJ (nov. 2025 – nov. 2026)',
  ],
};
