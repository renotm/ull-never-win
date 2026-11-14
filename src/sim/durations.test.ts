import { describe, expect, it } from 'vitest';
import { GAMES } from '../games';
import { Schedule } from '../lib/calendar';
import { rankProbability } from '../lib/odds';
import { randomBinomial } from '../lib/random';
import { Engine } from './engine';

const game = (id: string) => GAMES.find((g) => g.id === id)!;

describe('loi binomiale', () => {
  const cases: [number, number][] = [
    [20, 0.3], // simulation directe
    [1e6, 1e-5], // Poisson
    [1e9, 0.01], // normale
    [5e12, 1 / 19_068_840], // âge de l'Univers au Loto
  ];
  for (const [n, p] of cases) {
    it(`B(${n}, ${p}) : moyenne correcte`, () => {
      const N = 4000;
      let sum = 0;
      for (let i = 0; i < N; i++) sum += randomBinomial(n, p);
      const mean = n * p;
      const sd = Math.sqrt(mean * (1 - p));
      // Moyenne empirique à moins de 5 écarts-types de la moyenne théorique.
      expect(Math.abs(sum / N - mean)).toBeLessThan((5 * sd) / Math.sqrt(N));
    });
  }
});

describe('calendrier', () => {
  it('Loto 3 tirages/semaine : ~156 tirages par an, ~15 650 par siècle', () => {
    const s = new Schedule(game('loto').drawOptions, new Date(2026, 10, 14, 12, 0));
    const y1 = s.countForYears(1);
    expect(y1).toBeGreaterThanOrEqual(156);
    expect(y1).toBeLessThanOrEqual(157);
    expect(Math.abs(s.countForYears(100) - 15_654)).toBeLessThan(3);
    // Le n-ième tirage est bien le dernier avant la fin.
    const end = s.startMinute + 10 * 525_949.2;
    const n = s.countUntil(end);
    expect(s.minuteOf(n - 1)).toBeLessThanOrEqual(end);
    expect(s.minuteOf(n)).toBeGreaterThan(end);
  });

  it('âge de l’Univers au Keno : nombre de tirages exact et dans les limites des flottants', () => {
    const s = new Schedule(game('keno').drawOptions);
    const n = s.countForYears(13.8e9);
    expect(n / 365.2425 / 13.8e9).toBeCloseTo(1, 3);
    expect(Number.isSafeInteger(s.minuteOf(n))).toBe(true);
  });
});

describe('moteur avec durée', () => {
  const loto = game('loto');
  const settings = { picks: 5, stake: 2.2 };
  const grid = { picks: [[1, 2, 3, 4, 5], [1]], settings };

  it('durée fixe : s’arrête pile au nombre de tirages', () => {
    const e = new Engine(loto, [grid], [1], { stopOnJackpot: false, maxDraws: 1234 });
    e.run(1e6);
    expect(e.draws).toBe(1234);
    expect(e.finished).toBe(true);
  });

  it('durée fixe : continue après un gros lot', () => {
    const keno = game('keno');
    const s = { picks: 4, stake: 1 };
    const e = new Engine(keno, [{ picks: [[1, 2, 3, 4]], settings: s }], [1], { stopOnJackpot: false, maxDraws: 200_000 });
    e.run(1e6);
    expect(e.draws).toBe(200_000);
    expect(e.rankCounts[0][0]).toBeGreaterThan(500); // ~990 attendus (1 sur 202)
  });

  it('mode statistique : nombres de gains proches de la théorie', () => {
    const n = 4.54e9 * 156.5; // âge de la Terre, 3 tirages par semaine
    const e = new Engine(loto, [grid], [1], { stopOnJackpot: false, maxDraws: n });
    e.runStatistical(Infinity);
    expect(e.draws).toBe(n);
    loto.ranks(settings).forEach((r, i) => {
      const expected = n * rankProbability(loto, settings, r);
      expect(Math.abs(e.rankCounts[0][i] - expected)).toBeLessThan(6 * Math.sqrt(expected));
    });
    expect(e.lastDraw()[0]).toHaveLength(5);
  });
});
