import type { DrawOption, Slot } from '../games/types';

/**
 * Calendrier "maison" : les dates JavaScript s'arrêtent en l'an 275 760,
 * or certaines simulations vont beaucoup plus loin. On compte donc en
 * jours depuis le 1er janvier 1970 et on convertit nous-mêmes
 * (algorithme de Howard Hinnant, calendrier grégorien proleptique).
 */
export interface CivilDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  weekday: number; // 0 = dimanche
}

export function civilFromDays(z: number): CivilDate {
  const weekday = (((z % 7) + 7 + 4) % 7); // 1970-01-01 était un jeudi
  z += 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? y + 1 : y, month, day, weekday };
}

export function daysFromCivil(y: number, m: number, d: number): number {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/**
 * Programme des tirages : à partir de maintenant, la liste ordonnée des
 * horaires choisis forme un cycle hebdomadaire.
 * Le tirage n° i (0 = le premier) a lieu à `minuteOf(i)` minutes depuis 1970 (heure locale).
 */
export class Schedule {
  /** Minute absolue des tirages de la première semaine du cycle. */
  private readonly firstCycle: number[];
  /** Slots dans l'ordre du cycle (même ordre que firstCycle). */
  readonly slots: Slot[];
  readonly startMinute: number;

  constructor(options: DrawOption[], now: Date = new Date()) {
    const all = options.flatMap((o) => o.slots);
    const startDay = daysFromCivil(now.getFullYear(), now.getMonth() + 1, now.getDate());
    this.startMinute = startDay * MINUTES_PER_DAY + now.getHours() * 60 + now.getMinutes();
    const weekStartDay = startDay - now.getDay(); // dimanche de cette semaine
    const weekStart = weekStartDay * MINUTES_PER_DAY;

    const withMinute = all
      .map((slot) => {
        let m = weekStart + slot.weekday * MINUTES_PER_DAY + slot.hour * 60 + slot.minute;
        if (m <= this.startMinute) m += MINUTES_PER_WEEK;
        return { slot, m };
      })
      .sort((a, b) => a.m - b.m);
    this.firstCycle = withMinute.map((x) => x.m);
    this.slots = withMinute.map((x) => x.slot);
  }

  get perWeek(): number {
    return this.firstCycle.length;
  }

  minuteOf(i: number): number {
    const L = this.firstCycle.length;
    return this.firstCycle[i % L] + Math.floor(i / L) * MINUTES_PER_WEEK;
  }

  /** Nombre de tirages ayant lieu au plus tard à la minute `end`. */
  countUntil(end: number): number {
    const L = this.firstCycle.length;
    if (L === 0 || end < this.firstCycle[0]) return 0;
    const weeks = Math.floor((end - this.firstCycle[0]) / MINUTES_PER_WEEK);
    let n = weeks * L;
    while (this.minuteOf(n) <= end) n++;
    return n;
  }

  /** Nombre de tirages pendant `years` années à partir de maintenant. */
  countForYears(years: number): number {
    return this.countUntil(this.startMinute + years * MINUTES_PER_YEAR);
  }
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const intFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function formatMinute(absMinute: number, withTime: boolean): string {
  const day = Math.floor(absMinute / MINUTES_PER_DAY);
  const c = civilFromDays(day);
  const year = c.year >= 10000 ? intFmt.format(c.year) : String(c.year);
  let s = `${WEEKDAYS[c.weekday]} ${c.day === 1 ? '1er' : c.day} ${MONTHS[c.month - 1]} ${year}`;
  if (withTime) {
    const mod = absMinute - day * MINUTES_PER_DAY;
    s += ` à ${Math.floor(mod / 60)}h${String(mod % 60).padStart(2, '0')}`;
  }
  return s;
}

export const MINUTES_PER_YEAR = 365.2425 * MINUTES_PER_DAY;

/** "12 345 ans, 3 mois et 2 jours" */
export function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  if (days < 1) return `${Math.floor(minutes / 60)} h ${Math.floor(minutes % 60)} min`;
  const years = Math.floor(days / 365.2425);
  const restDays = days - years * 365.2425;
  const months = Math.floor(restDays / 30.436875);
  const d = Math.floor(restDays - months * 30.436875);
  const parts: string[] = [];
  if (years) parts.push(`${intFmt.format(years)} an${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} mois`);
  if (d || !parts.length) parts.push(`${d} jour${d > 1 ? 's' : ''}`);
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1] : parts[0];
}
