import type { GridSettings } from '../games/types';

export interface SimGrid {
  picks: number[][];
  settings: GridSettings;
}

/** Vitesse en tirages par seconde ; 0 = au maximum. */
export type Rate = number;

export interface SimConfig {
  gameId: string;
  grids: SimGrid[];
  jackpotFactors: number[];
  rate: Rate;
  /** Nombre total de tirages à effectuer (null = jusqu'au gros lot). */
  maxDraws: number | null;
  /** Mode statistique (très longues durées). */
  statistical: boolean;
}

export type ToWorker =
  | ({ type: 'init' } & SimConfig)
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'speed'; rate: Rate };

export interface WinEvent {
  drawIndex: number;
  gridIndex: number;
  rank: number;
  prize: number;
}

export interface Progress {
  type: 'progress';
  draws: number;
  /** rankCounts[grille][rang] */
  rankCounts: number[][];
  /** Gains cumulés par grille (€). */
  won: number[];
  /** Dernier tirage effectué (ou tirage d'exemple en mode statistique), une liste triée par urne. */
  lastDraw: number[][];
  /** Rang obtenu par chaque grille à ce tirage (-1 = perdu). */
  lastRanks: number[];
  /** Gros gains survenus depuis le message précédent (pas en mode statistique). */
  events: WinEvent[];
  /** Premier rang 1 obtenu. */
  jackpot: WinEvent | null;
  running: boolean;
  /** La simulation est terminée (durée atteinte ou gros lot en mode "jusqu'au gros lot"). */
  finished: boolean;
  /** Vitesse mesurée (tirages/s). */
  measuredRate: number;
}

export type FromWorker = Progress;
