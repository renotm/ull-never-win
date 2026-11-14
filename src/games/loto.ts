import type { GameDef } from './types';

const slot = (weekday: number) => [{ weekday, hour: 20, minute: 35 }];

export const loto: GameDef = {
  id: 'loto',
  name: 'Loto',
  tagline: '5 numéros sur 49 + 1 numéro Chance sur 10 · lundi, mercredi, samedi',
  color: '#d6336c',
  pools: [
    { key: 'numbers', label: 'Numéros', size: 49, drawCount: 5, playerChooses: true, ballStyle: 'main' },
    { key: 'chance', label: 'Numéro Chance', size: 10, drawCount: 1, playerChooses: true, ballStyle: 'chance' },
  ],
  pickCounts: [5, 1],
  stakes: [2.2],
  prizeScalesWithStake: false,
  drawOptions: [
    { id: 'lun', label: 'Lundi', slots: slot(1) },
    { id: 'mer', label: 'Mercredi', slots: slot(3) },
    { id: 'sam', label: 'Samedi', slots: slot(6) },
  ],
  ranks: () => [
    {
      label: '5 numéros + Chance',
      matches: [[5], [1]],
      prize: 7_000_000,
      average: true,
      prizeNote: 'Jackpot (2 M€ minimum). Moyenne des jackpots remportés depuis 2019 : environ 7 M€.',
    },
    { label: '5 numéros', matches: [[5], [0]], prize: 112_000, average: true },
    { label: '4 numéros + Chance', matches: [[4], [1]], prize: 2_750, average: true },
    { label: '4 numéros', matches: [[4], [0]], prize: 460, average: true },
    { label: '3 numéros + Chance', matches: [[3], [1]], prize: 54, average: true },
    { label: '3 numéros', matches: [[3], [0]], prize: 21, average: true },
    { label: '2 numéros + Chance', matches: [[2], [1]], prize: 10.4, average: true },
    { label: '2 numéros', matches: [[2], [0]], prize: 4.45, average: true },
    { label: '0 ou 1 numéro + Chance', matches: [[0, 1], [1]], prize: 2.2, prizeNote: 'Mise remboursée' },
  ],
  sources: [
    'Règlement du Loto (FDJ, mars 2025) pour les rangs et les probabilités',
    'Gains moyens calculés sur les résultats officiels FDJ (nov. 2025 – nov. 2026)',
  ],
};
