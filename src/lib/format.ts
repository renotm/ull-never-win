const int = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export const fmtInt = (n: number): string => int.format(n);
export const fmtDec = (n: number): string => dec.format(n);
export const fmtEur = (n: number): string => (Math.abs(n) >= 1000 ? eur0.format(n) : eur.format(n));

/** "1 chance sur 19 068 840" */
export function fmtOdds(p: number): string {
  if (p <= 0) return '—';
  const x = 1 / p;
  return `1 sur ${x >= 100 ? int.format(Math.round(x)) : dec.format(x)}`;
}

/** Grands nombres en toutes lettres : 1,2 million, 3,4 milliards… */
export function fmtBig(n: number): string {
  const units: [number, string, string][] = [
    [1e12, 'billion', 'billions'],
    [1e9, 'milliard', 'milliards'],
    [1e6, 'million', 'millions'],
  ];
  for (const [v, s, pl] of units) {
    if (Math.abs(n) >= v) {
      const x = n / v;
      return `${dec.format(Math.round(x * 10) / 10)} ${Math.abs(x) >= 2 ? pl : s}`;
    }
  }
  return int.format(n);
}

/** Montant en euros, en toutes lettres au-delà du million : "3,4 milliards €". */
export const fmtEurBig = (n: number): string => (Math.abs(n) >= 1e6 ? `${fmtBig(n)} €` : fmtEur(n));

export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** Durée de calcul : "45 s", "3 min 20 s", "2 h 05 min". */
export function fmtSeconds(sec: number): string {
  const s = Math.ceil(sec);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
  return `${int.format(Math.round(s / 86400))} jours`;
}
