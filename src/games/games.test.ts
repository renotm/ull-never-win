import { describe, expect, it } from 'vitest';
import { GAMES } from '.';
import { buildRankLookup, rankProbability } from '../lib/odds';
import { Engine } from '../sim/engine';
import type { GameDef, GridSettings } from './types';

const game = (id: string): GameDef => GAMES.find((g) => g.id === id)!;
const defaults = (g: GameDef): GridSettings => ({ picks: g.pickCounts[0], stake: g.stakes[0] });

/** "1 chance sur X" des règlements officiels. */
const OFFICIAL: Record<string, number[]> = {
  loto: [19_068_840, 2_118_760, 86_677, 9_631, 2_016, 224, 144, 16],
  euromillions: [139_838_160, 6_991_908, 3_107_515, 621_503, 31_075, 14_125, 13_811, 985.5, 706.3, 313.9, 187.7, 49.3, 21.9],
  eurodreams: [19_191_900, 4_797_975, 18_815.6, 456.1, 32.1, 5.5],
  crescendo: [3_268_760, 130_750, 26_150, 4_151, 830, 359, 72, 68, 14, 7],
};

describe('probabilités des rangs = règlements FDJ', () => {
  for (const [id, odds] of Object.entries(OFFICIAL)) {
    it(id, () => {
      const g = game(id);
      const ranks = g.ranks(defaults(g));
      odds.forEach((x, i) => {
        const computed = 1 / rankProbability(g, defaults(g), ranks[i]);
        // Le règlement arrondit : à l'entier ou au dixième près.
        const ok = Math.abs(computed - x) / x < 0.005 || Math.abs(computed - x) < 0.5;
        expect(ok, `rang ${i + 1} : calculé 1/${computed.toFixed(2)}, officiel 1/${x}`).toBe(true);
      });
    });
  }

  it('keno 10 numéros', () => {
    const g = game('keno');
    const s = { picks: 10, stake: 1 };
    const ranks = g.ranks(s);
    expect(1 / rankProbability(g, s, ranks[0])).toBeCloseTo(4_446_435, -1);
    expect(Math.round(1 / rankProbability(g, s, ranks[ranks.length - 1]))).toBe(42); // 0 bon numéro
  });
});

describe('table de correspondance des rangs', () => {
  it('loto : 1 numéro + Chance = dernier rang, 1 numéro sans Chance = perdu', () => {
    const g = game('loto');
    const lookup = buildRankLookup(g, defaults(g));
    // index = bons numéros * 2 + chance
    expect(lookup[1 * 2 + 1]).toBe(8);
    expect(lookup[1 * 2 + 0]).toBe(-1);
    expect(lookup[5 * 2 + 1]).toBe(0);
  });
});

describe('moteur', () => {
  it('fréquences observées proches de la théorie (Crescendo, 200 000 tirages)', () => {
    const g = game('crescendo');
    // Sans arrêt au gros lot : sinon ~6 % de chances de s'arrêter avant la fin et de fausser le comptage.
    const engine = new Engine(g, [{ picks: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1]], settings: defaults(g) }], [1], {
      stopOnJackpot: false,
      maxDraws: null,
    });
    const N = 200_000;
    engine.run(N);
    const ranks = g.ranks(defaults(g));
    // Dernier rang (1 sur 7) et rang 9 (1 sur 14)
    for (const r of [9, 8]) {
      const expected = N * rankProbability(g, defaults(g), ranks[r]);
      expect(Math.abs(engine.rankCounts[0][r] - expected) / expected).toBeLessThan(0.05);
    }
  });

  it('s’arrête au premier rang 1', () => {
    const g = game('keno');
    const s = { picks: 4, stake: 1 };
    const engine = new Engine(g, [{ picks: [[1, 2, 3, 4]], settings: s }], [1]);
    engine.run(10_000_000);
    expect(engine.jackpot).not.toBeNull();
    expect(engine.rankCounts[0][0]).toBe(1);
    expect(engine.draws).toBe(engine.jackpot!.drawIndex + 1);
  });
});
