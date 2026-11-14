import type { GameDef } from '../games/types';
import { buildRankLookup, pickCountsFor, rankProbability } from '../lib/odds';
import { partialShuffle, randomBinomial } from '../lib/random';
import type { SimGrid, WinEvent } from './protocol';

/** Montant au-delà duquel un gain est signalé dans le fil des "gros gains". */
const NOTABLE_PRIZE = 1000;
const MAX_EVENTS = 100;

export interface EngineOptions {
  /** S'arrêter au premier rang 1 (mode "jusqu'au gros lot"). */
  stopOnJackpot: boolean;
  /** Nombre maximal de tirages (null = illimité). */
  maxDraws: number | null;
}

/**
 * Moteur de simulation, indépendant du Web Worker (testable).
 * Optimisé pour enchaîner des millions de tirages : pas d'allocation
 * dans la boucle chaude.
 */
export class Engine {
  draws = 0;
  readonly rankCounts: Float64Array[];
  readonly won: Float64Array;
  readonly lastRanks: Int8Array;
  events: WinEvent[] = [];
  jackpot: WinEvent | null = null;

  private readonly poolArrays: Int32Array[];
  private readonly drawCounts: number[];
  /** marks[grille][urne][numéro] = 1 si coché */
  private readonly marks: Uint8Array[][];
  private readonly dims: number[][];
  private readonly lookups: Int8Array[];
  /** prizes[grille][rang] = gain pour un tirage avec jackpotFactor 1 */
  private readonly prizes: number[][];
  private readonly usesFactor: boolean[][];
  /** probas[grille][rang], pour le mode statistique */
  private readonly probas: number[][];
  private readonly meanFactor: number;
  private hasDrawn = false;

  constructor(
    readonly game: GameDef,
    readonly grids: SimGrid[],
    private readonly jackpotFactors: number[],
    private readonly options: EngineOptions = { stopOnJackpot: true, maxDraws: null },
  ) {
    this.poolArrays = game.pools.map((p) => Int32Array.from({ length: p.size }, (_, i) => i + 1));
    this.drawCounts = game.pools.map((p) => p.drawCount);
    this.marks = grids.map((g) =>
      game.pools.map((p, i) => {
        const m = new Uint8Array(p.size + 1);
        for (const n of g.picks[i]) m[n] = 1;
        return m;
      }),
    );
    this.dims = grids.map((g) => pickCountsFor(game, g.settings).map((c) => c + 1));
    this.lookups = grids.map((g) => buildRankLookup(game, g.settings));
    const rankLists = grids.map((g) => game.ranks(g.settings));
    this.prizes = grids.map((g, i) =>
      rankLists[i].map((r) => r.prize * (game.prizeScalesWithStake ? g.settings.stake : 1)),
    );
    this.usesFactor = rankLists.map((rs) => rs.map((r) => !!r.usesJackpotFactor));
    this.probas = grids.map((g, i) => rankLists[i].map((r) => rankProbability(game, g.settings, r)));
    this.meanFactor = jackpotFactors.reduce((a, b) => a + b, 0) / jackpotFactors.length;
    this.rankCounts = rankLists.map((rs) => new Float64Array(rs.length));
    this.won = new Float64Array(grids.length);
    this.lastRanks = new Int8Array(grids.length).fill(-1);
  }

  /** La simulation est terminée. */
  get finished(): boolean {
    if (this.options.stopOnJackpot && this.jackpot) return true;
    return this.options.maxDraws !== null && this.draws >= this.options.maxDraws;
  }

  private remaining(n: number): number {
    return this.options.maxDraws === null ? n : Math.min(n, this.options.maxDraws - this.draws);
  }

  /** Tire les boules et calcule le rang de chaque grille dans lastRanks. */
  private drawOnce(): void {
    const pools = this.poolArrays;
    const nPools = pools.length;
    for (let p = 0; p < nPools; p++) partialShuffle(pools[p], this.drawCounts[p]);
    for (let g = 0; g < this.grids.length; g++) {
      const marks = this.marks[g];
      const dims = this.dims[g];
      let idx = 0;
      for (let p = 0; p < nPools; p++) {
        const arr = pools[p];
        const mk = marks[p];
        let m = 0;
        for (let k = this.drawCounts[p] - 1; k >= 0; k--) m += mk[arr[k]];
        idx = idx * dims[p] + m;
      }
      this.lastRanks[g] = this.lookups[g][idx];
    }
    this.hasDrawn = true;
  }

  private pushEvent(ev: WinEvent): void {
    if (this.events.length >= MAX_EVENTS) this.events.splice(0, MAX_EVENTS / 2);
    this.events.push(ev);
  }

  /**
   * Effectue jusqu'à `n` tirages, boule par boule.
   * S'arrête si la simulation est terminée. Retourne le nombre effectué.
   */
  run(n: number): number {
    n = this.remaining(n);
    const nGrids = this.grids.length;
    const stopOnJackpot = this.options.stopOnJackpot;
    let done = 0;
    while (done < n && !(stopOnJackpot && this.jackpot)) {
      this.drawOnce();
      const drawIndex = this.draws;
      const factor = this.jackpotFactors[drawIndex % this.jackpotFactors.length];
      for (let g = 0; g < nGrids; g++) {
        const r = this.lastRanks[g];
        if (r >= 0) {
          this.rankCounts[g][r]++;
          const prize = this.prizes[g][r] * (this.usesFactor[g][r] ? factor : 1);
          this.won[g] += prize;
          if (r === 0 || prize >= NOTABLE_PRIZE) {
            const ev = { drawIndex, gridIndex: g, rank: r, prize };
            this.pushEvent(ev);
            if (r === 0 && !this.jackpot) this.jackpot = ev;
          }
        }
      }
      this.draws++;
      done++;
    }
    return done;
  }

  /**
   * Mode statistique : simule `n` tirages d'un coup en tirant directement le
   * nombre de gains de chaque rang (loi multinomiale, par binomiales
   * successives). Chaque grille est traitée indépendamment : les totaux et
   * moyennes sont exacts, seule la corrélation entre grilles est perdue.
   */
  runStatistical(n: number): number {
    n = this.remaining(n);
    if (n <= 0) return 0;
    for (let g = 0; g < this.grids.length; g++) {
      const probas = this.probas[g];
      let left = n;
      let massLeft = 1;
      for (let r = 0; r < probas.length && left > 0; r++) {
        const p = probas[r];
        const k = randomBinomial(left, Math.min(1, p / massLeft));
        left -= k;
        massLeft -= p;
        if (k > 0) {
          this.rankCounts[g][r] += k;
          this.won[g] += k * this.prizes[g][r] * (this.usesFactor[g][r] ? this.meanFactor : 1);
          if (r === 0 && !this.jackpot) {
            // Position approximative du premier gros lot dans le paquet.
            this.jackpot = {
              drawIndex: this.draws + Math.floor(n / (k + 1)),
              gridIndex: g,
              rank: 0,
              prize: this.prizes[g][0] * (this.usesFactor[g][0] ? this.meanFactor : 1),
            };
          }
        }
      }
    }
    this.draws += n;
    // Un vrai tirage, pour l'affichage.
    this.drawOnce();
    return n;
  }

  /** Le dernier tirage, trié, une liste par urne. */
  lastDraw(): number[][] {
    if (!this.hasDrawn) return this.game.pools.map(() => []);
    return this.poolArrays.map((arr, p) => Array.from(arr.subarray(0, this.drawCounts[p])).sort((a, b) => a - b));
  }

  takeEvents(): WinEvent[] {
    const e = this.events;
    this.events = [];
    return e.length > 50 ? e.slice(-50) : e;
  }
}
