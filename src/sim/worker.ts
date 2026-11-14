/// <reference lib="webworker" />
import { GAMES } from '../games';
import { Engine } from './engine';
import type { Progress, Rate, ToWorker } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

const CHUNK_MS = 25;
const POST_EVERY_MS = 33;

let engine: Engine | null = null;
let statistical = false;
let running = false;
let rate: Rate = 0;
let baseTime = 0;
let baseDraws = 0;
let lastPost = 0;
let lastPostDraws = 0;
let measuredRate = 0;
let scheduled = false;

// MessageChannel : rend la main à la boucle d'évènements sans le délai minimal de setTimeout.
const channel = new MessageChannel();
channel.port1.onmessage = () => {
  scheduled = false;
  tick();
};

function schedule(): void {
  if (scheduled || !running) return;
  scheduled = true;
  if (rate === 0) channel.port2.postMessage(null);
  else setTimeout(() => channel.port2.postMessage(null), 10);
}

function rebase(): void {
  if (!engine) return;
  baseTime = performance.now();
  baseDraws = engine.draws;
}

function post(): void {
  if (!engine) return;
  const now = performance.now();
  const dt = now - lastPost;
  if (dt > 0) measuredRate = measuredRate * 0.7 + (((engine.draws - lastPostDraws) * 1000) / dt) * 0.3;
  lastPost = now;
  lastPostDraws = engine.draws;
  const msg: Progress = {
    type: 'progress',
    draws: engine.draws,
    rankCounts: engine.rankCounts.map((c) => Array.from(c)),
    won: Array.from(engine.won),
    lastDraw: engine.lastDraw(),
    lastRanks: Array.from(engine.lastRanks),
    events: engine.takeEvents(),
    jackpot: engine.jackpot,
    running,
    finished: engine.finished,
    measuredRate: running ? measuredRate : 0,
  };
  self.postMessage(msg);
}

/** Avance de `todo` tirages au plus, sans dépasser le temps imparti. Retourne le nombre restant. */
function advance(todo: number, deadline: number): number {
  const e = engine!;
  if (statistical) {
    // Instantané quelle que soit la taille du paquet : c'est la vitesse
    // demandée (rate) qui règle la fluidité de l'animation.
    return todo - e.runStatistical(todo);
  }
  let left = todo;
  while (left > 0 && !e.finished && performance.now() < deadline) {
    const done = e.run(Math.min(left, 512));
    if (done === 0) break;
    left -= done;
  }
  return left;
}

function tick(): void {
  if (!engine || !running) return;
  const start = performance.now();
  const deadline = start + CHUNK_MS;
  if (rate === 0) {
    advance(statistical ? Infinity : Number.MAX_SAFE_INTEGER, deadline);
  } else {
    const target = baseDraws + Math.floor(((start - baseTime) / 1000) * rate);
    const todo = target - engine.draws;
    // Si on prend du retard, on ne cherche pas à rattraper.
    if (todo > 0 && advance(todo, deadline) > 0) rebase();
  }
  if (engine.finished) running = false;
  const now = performance.now();
  // Aux vitesses lentes, on envoie chaque tirage pour l'animation.
  if (now - lastPost >= POST_EVERY_MS || !running || (rate > 0 && rate <= 10 && engine.draws !== lastPostDraws)) post();
  schedule();
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init': {
      const game = GAMES.find((g) => g.id === msg.gameId);
      if (!game) throw new Error(`Jeu inconnu : ${msg.gameId}`);
      engine = new Engine(game, msg.grids, msg.jackpotFactors, {
        stopOnJackpot: msg.maxDraws === null,
        maxDraws: msg.maxDraws,
      });
      statistical = msg.statistical;
      rate = msg.rate;
      running = true;
      lastPost = performance.now();
      lastPostDraws = 0;
      measuredRate = 0;
      rebase();
      post();
      schedule();
      break;
    }
    case 'pause':
      running = false;
      post();
      break;
    case 'resume':
      if (engine && !engine.finished) {
        running = true;
        rebase();
        lastPost = performance.now();
        lastPostDraws = engine.draws;
        schedule();
      }
      break;
    case 'speed':
      rate = msg.rate;
      rebase();
      break;
  }
};
