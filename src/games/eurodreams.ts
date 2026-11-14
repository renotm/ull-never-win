import type { GameDef } from './types';

const slot = (weekday: number) => [{ weekday, hour: 21, minute: 0 }];
const ANY = [0, 1];

export const eurodreams: GameDef = {
  id: 'eurodreams',
  name: 'EuroDreams',
  tagline: '6 numéros sur 40 + 1 numéro Dream sur 5 · lundi, jeudi',
  color: '#0f9d8a',
  pools: [
    { key: 'numbers', label: 'Numéros', size: 40, drawCount: 6, playerChooses: true, ballStyle: 'main' },
    { key: 'dream', label: 'Numéro Dream', size: 5, drawCount: 1, playerChooses: true, ballStyle: 'dream' },
  ],
  pickCounts: [6, 1],
  stakes: [2.5],
  prizeScalesWithStake: false,
  drawOptions: [
    { id: 'lun', label: 'Lundi', slots: slot(1) },
    { id: 'jeu', label: 'Jeudi', slots: slot(4) },
  ],
  ranks: () => [
    {
      label: '6 numéros + Dream',
      matches: [[6], [1]],
      prize: 20_000 * 12 * 30,
      prizeNote: 'Rente de 20 000 € par mois pendant 30 ans (soit 7,2 M€).',
    },
    {
      label: '6 numéros',
      matches: [[6], [0]],
      prize: 2_000 * 12 * 5,
      prizeNote: 'Rente de 2 000 € par mois pendant 5 ans (soit 120 000 €).',
    },
    { label: '5 numéros', matches: [[5], ANY], prize: 500, average: true },
    { label: '4 numéros', matches: [[4], ANY], prize: 34, average: true },
    { label: '3 numéros', matches: [[3], ANY], prize: 4.9, average: true },
    { label: '2 numéros', matches: [[2], ANY], prize: 2.5, prizeNote: 'Mise remboursée' },
  ],
  sources: [
    'Règlement EuroDreams (FDJ, octobre 2025)',
    'Gains moyens calculés sur les résultats officiels FDJ depuis octobre 2025',
  ],
};
