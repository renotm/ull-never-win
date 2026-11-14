import type { GameDef } from './types';

const HOURS = [13, 14, 15, 16, 17, 18, 19];

export const crescendo: GameDef = {
  id: 'crescendo',
  name: 'Crescendo',
  tagline: '10 numéros sur 25 + 1 lettre attribuée au hasard · 7 tirages le samedi',
  color: '#8e44ad',
  pools: [
    { key: 'numbers', label: 'Numéros', size: 25, drawCount: 10, playerChooses: true, ballStyle: 'main' },
    {
      key: 'letter',
      label: 'Lettre',
      size: 6,
      drawCount: 1,
      playerChooses: false,
      symbols: ['S', 'A', 'M', 'E', 'D', 'I'],
      ballStyle: 'letter',
    },
  ],
  pickCounts: [10, 1],
  stakes: [1],
  prizeScalesWithStake: false,
  drawOptions: HOURS.map((h, i) => ({
    id: `${h}h`,
    label: `${h}h`,
    slots: [{ weekday: 6, hour: h, minute: 0, jackpotFactor: i + 1 }],
  })),
  ranks: () => [
    {
      label: '10 numéros',
      matches: [[10], [0, 1]],
      prize: 100000,
      usesJackpotFactor: true,
      prizeNote:
        '100 000 € à 13h, +100 000 € à chaque tirage du samedi sans gagnant (700 000 € à 19h). On suppose que personne d’autre ne gagne le même jour.',
    },
    { label: '9 numéros + lettre', matches: [[9], [1]], prize: 1000 },
    { label: '9 numéros', matches: [[9], [0]], prize: 500 },
    { label: '8 numéros + lettre', matches: [[8], [1]], prize: 100 },
    { label: '8 numéros', matches: [[8], [0]], prize: 50 },
    { label: '7 numéros + lettre', matches: [[7], [1]], prize: 14 },
    { label: '7 numéros', matches: [[7], [0]], prize: 7 },
    { label: '6 numéros + lettre', matches: [[6], [1]], prize: 2 },
    { label: '6 numéros', matches: [[6], [0]], prize: 1 },
    { label: '0 à 5 numéros + lettre', matches: [[0, 1, 2, 3, 4, 5], [1]], prize: 1, prizeNote: 'Mise remboursée' },
  ],
  sources: ['Règlement du jeu Crescendo (FDJ, novembre 2025), article 8'],
};
