/**
 * "Et si tu n'avais pas joué ?" : l'argent des mises placé sur Livret A + LDDS.
 *
 * Règles (novembre 2026) :
 * - taux de 1,7 % net, identique pour les deux livrets ;
 * - plafonds de versement : 22 950 € (Livret A) + 12 000 € (LDDS) ;
 * - les intérêts capitalisés peuvent dépasser le plafond, mais on ne peut plus
 *   verser dès que le solde l'atteint ;
 * - au-delà, l'argent reste sur un compte courant à 0 %.
 *
 * Simplifications : intérêts annuels, versements répartis uniformément dans
 * l'année (donc rémunérés en moyenne une demi-année l'année du versement),
 * taux constant, pas d'inflation.
 *
 * Sur les très longues durées, les intérêts composés dépassent ce qu'un
 * nombre flottant peut représenter : on calcule alors en logarithme.
 */
export const LIVRET_RATE = 0.017;
export const LIVRET_A_CAP = 22_950;
export const LDDS_CAP = 12_000;
export const LIVRETS_CAP = LIVRET_A_CAP + LDDS_CAP;

/** Montant pouvant être astronomique : on garde toujours son log10. */
export interface Amount {
  log10: number;
  /** Valeur exacte si elle est représentable (sinon Infinity). */
  value: number;
}

export const amount = (value: number): Amount => ({ value, log10: value > 0 ? Math.log10(value) : -Infinity });

export interface SavingsResult {
  /** Total misé (= versé en épargne). */
  staked: number;
  /** Part versée sur les livrets. */
  depositedLivrets: number;
  /** Part restée sur le compte courant. */
  cash: number;
  /** Solde final des livrets (versements + intérêts). */
  livrets: Amount;
  /** Total : livrets + compte courant. */
  total: Amount;
  /** Années au bout desquelles les livrets sont pleins (null si jamais). */
  fullAfterYears: number | null;
  /** Solde total année par année (seulement si la durée est raisonnable). */
  curve: { years: number; total: number }[] | null;
}

const MAX_CURVE_YEARS = 2000;

/**
 * @param years durée de jeu (années)
 * @param staked total misé sur cette durée
 */
export function computeSavings(years: number, staked: number): SavingsResult {
  if (years <= 0 || staked <= 0) {
    return { staked, depositedLivrets: 0, cash: 0, livrets: amount(0), total: amount(0), fullAfterYears: null, curve: [] };
  }
  const perYear = staked / years;
  const withCurve = years <= MAX_CURVE_YEARS;
  const curve: { years: number; total: number }[] = withCurve ? [{ years: 0, total: 0 }] : [];

  let livrets = 0;
  let deposited = 0;
  let t = 0;
  let fullAfterYears: number | null = null;

  // Phase 1 : année par année, tant que les livrets ne sont pas pleins.
  while (t < years && fullAfterYears === null) {
    const dt = Math.min(1, years - t);
    const flow = perYear * dt;
    const toLivrets = Math.min(flow, Math.max(0, LIVRETS_CAP - livrets));
    livrets += livrets * LIVRET_RATE * dt + toLivrets * (1 + (LIVRET_RATE * dt) / 2);
    deposited += toLivrets;
    t += dt;
    if (livrets >= LIVRETS_CAP) fullAfterYears = t;
    if (withCurve) curve.push({ years: t, total: livrets + (perYear * t - deposited) });
  }

  // Phase 2 : livrets pleins, ils ne font plus que capitaliser.
  const rest = years - t;
  const growthLog = rest * Math.log10(1 + LIVRET_RATE);
  const livretsLog = livrets > 0 ? Math.log10(livrets) + growthLog : -Infinity;
  const livretsAmount: Amount = { log10: livretsLog, value: livretsLog < 300 ? Math.pow(10, livretsLog) : Infinity };
  if (withCurve) {
    for (let y = Math.floor(t) + 1; y <= years; y++) {
      curve.push({ years: y, total: livrets * Math.pow(1 + LIVRET_RATE, y - t) + (perYear * y - deposited) });
    }
  }

  const cash = staked - deposited;
  const totalLog = logSum(livretsLog, cash > 0 ? Math.log10(cash) : -Infinity);
  return {
    staked,
    depositedLivrets: deposited,
    cash,
    livrets: livretsAmount,
    total: { log10: totalLog, value: totalLog < 300 ? Math.pow(10, totalLog) : Infinity },
    fullAfterYears,
    curve: withCurve ? curve : null,
  };
}

/** log10(10^a + 10^b) sans débordement. */
function logSum(a: number, b: number): number {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return hi + Math.log10(1 + Math.pow(10, lo - hi));
}

/* ---------- Ce qu'on aurait pu s'offrir ---------- */

export interface Purchase {
  emoji: string;
  label: string;
  /** Prix indicatif (€, 2026). */
  price: number;
}

/** Prix indicatifs, ordres de grandeur en France en 2026. */
export const PURCHASES: Purchase[] = [
  { emoji: '☕', label: 'un café en terrasse', price: 2.5 },
  { emoji: '🎬', label: 'une place de cinéma', price: 12 },
  { emoji: '🍽️', label: 'un restaurant pour deux', price: 80 },
  { emoji: '📱', label: 'un smartphone haut de gamme', price: 1_200 },
  { emoji: '🏖️', label: 'une semaine de vacances en famille', price: 3_000 },
  { emoji: '🚗', label: 'une citadine neuve', price: 20_000 },
  { emoji: '🚙', label: 'un SUV familial neuf', price: 40_000 },
  { emoji: '🏡', label: 'une maison en province', price: 250_000 },
  { emoji: '🏎️', label: 'une Ferrari', price: 300_000 },
  { emoji: '🏙️', label: 'un appartement de 100 m² à Paris', price: 1_000_000 },
  { emoji: '🛥️', label: 'un yacht de 40 mètres', price: 20_000_000 },
  { emoji: '🛩️', label: 'un jet privé long-courrier', price: 60_000_000 },
  { emoji: '✈️', label: 'un Airbus A380', price: 450_000_000 },
  { emoji: '⚽', label: 'un grand club de football européen', price: 4_000_000_000 },
  { emoji: '🌍', label: 'toute la production mondiale d’une année (PIB mondial)', price: 100e12 },
  { emoji: '💰', label: 'toute la richesse des ménages de la planète', price: 450e12 },
];

/** Repères pour les montants astronomiques (option « pour rire »). */
export const COSMIC: { log10: number; text: string }[] = [
  { log10: 50, text: 'plus d’euros que d’atomes sur la Terre (environ 10^50)' },
  { log10: 80, text: 'plus d’euros que d’atomes dans tout l’Univers observable (environ 10^80)' },
  { log10: 1000, text: 'un nombre qu’aucune calculatrice ne sait afficher' },
];
