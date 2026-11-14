export interface DurationChoice {
  id: string;
  label: string;
  /** Durée en années ; null = jusqu'au gros lot. */
  years: number | null;
  detail?: string;
  /**
   * Mode statistique : au lieu de tirer chaque boule, on tire directement le
   * nombre de gains de chaque rang (loi multinomiale). Indispensable au-delà
   * de quelques milliards de tirages.
   */
  statistical: boolean;
}

export const DURATIONS: DurationChoice[] = [
  { id: '1y', label: '1 an', years: 1, statistical: false },
  { id: '10y', label: '10 ans', years: 10, statistical: false },
  { id: 'life', label: 'Une vie', detail: '80 ans', years: 80, statistical: false },
  { id: '100y', label: '1 siècle', years: 100, statistical: false },
  { id: '1000y', label: '1 millénaire', years: 1000, statistical: false },
  { id: 'humanity', label: 'L’histoire de l’humanité', detail: '300 000 ans, depuis Homo sapiens', years: 300_000, statistical: false },
  { id: '1My', label: '1 million d’années', years: 1_000_000, statistical: false },
  { id: 'earth', label: 'L’âge de la Terre', detail: '4,5 milliards d’années', years: 4.54e9, statistical: true },
  { id: 'universe', label: 'L’âge de l’Univers', detail: '13,8 milliards d’années', years: 13.8e9, statistical: true },
  { id: 'jackpot', label: 'Jusqu’au gros lot', years: null, statistical: false },
];

export const DEFAULT_DURATION = '10y';

export const durationById = (id: string): DurationChoice => DURATIONS.find((d) => d.id === id) ?? DURATIONS[1];
