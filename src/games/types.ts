/** Une "urne" : un ensemble de numéros (ou de symboles) dans lequel on tire. */
export interface Pool {
  key: string;
  label: string;
  /** Les numéros vont de 1 à size. */
  size: number;
  /** Nombre de numéros tirés au sort par la FDJ. */
  drawCount: number;
  /** Le joueur choisit lui-même (false = attribué au hasard, ex. lettre Crescendo). */
  playerChooses: boolean;
  /** Symboles à afficher à la place des numéros (ex. lettres). */
  symbols?: string[];
  /** Style des boules. */
  ballStyle: 'main' | 'star' | 'chance' | 'dream' | 'letter';
}

/** Un horaire de tirage dans la semaine. weekday : 0 = dimanche … 6 = samedi. */
export interface Slot {
  weekday: number;
  hour: number;
  minute: number;
  /** Multiplicateur du jackpot (Crescendo : 1 à 13h … 7 à 19h). */
  jackpotFactor?: number;
}

/** Ce que le joueur coche : "Mardi", "Midi", "14h"… */
export interface DrawOption {
  id: string;
  label: string;
  slots: Slot[];
}

export interface Rank {
  label: string;
  /** Nombre de bons numéros acceptés dans chaque urne (même ordre que pools). */
  matches: number[][];
  /** Gain pour une mise de base (ou montant fixe). */
  prize: number;
  /** Le gain du rang est multiplié par jackpotFactor du tirage. */
  usesJackpotFactor?: boolean;
  /** Texte d'explication affiché (ex. "rente de 20 000 €/mois pendant 30 ans"). */
  prizeNote?: string;
  /** true si le montant est une moyenne observée et non un montant fixe. */
  average?: boolean;
}

/** Paramètres variables d'une grille (utiles au Keno). */
export interface GridSettings {
  /** Nombre de numéros à cocher dans l'urne principale. */
  picks: number;
  /** Mise par tirage (€). */
  stake: number;
}

export interface GameDef {
  id: string;
  name: string;
  tagline: string;
  color: string;
  pools: Pool[];
  /** Nombre de numéros à cocher dans chaque urne (pour l'urne principale, voir pickRange). */
  pickCounts: number[];
  /** Keno : nombre de numéros cochés variable dans l'urne principale. */
  pickRange?: [number, number];
  /** Mises possibles (€). La première est la mise par défaut. */
  stakes: number[];
  /** Les gains sont proportionnels à la mise (Keno). */
  prizeScalesWithStake: boolean;
  drawOptions: DrawOption[];
  /** Rangs du meilleur au moins bon, pour une grille donnée. */
  ranks(settings: GridSettings): Rank[];
  sources: string[];
}

export interface Grid {
  id: number;
  /** Numéros choisis, une liste par urne. */
  picks: number[][];
  settings: GridSettings;
}
