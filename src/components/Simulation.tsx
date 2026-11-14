import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameDef, Grid } from '../games/types';
import { MINUTES_PER_YEAR, Schedule, formatDuration, formatMinute } from '../lib/calendar';
import { durationById } from '../lib/durations';
import { fmtBig, fmtEur, fmtEurBig, fmtInt, fmtOdds, fmtSeconds, lowerFirst } from '../lib/format';
import { jackpotProbability, probabilityWithin } from '../lib/jackpot';
import { rankProbability } from '../lib/odds';
import type { Progress, Rate, ToWorker, WinEvent } from '../sim/protocol';
import { Ball } from './Ball';
import { NoPlay, type WonSample } from './NoPlay';
import { TimeTravel } from './TimeTravel';

interface Props {
  game: GameDef;
  grids: Grid[];
  optionIds: string[];
  durationId: string;
  onBack: () => void;
  onHome: () => void;
}

/** Durée visée pour l'animation en vitesse automatique. */
const AUTO_TARGET_SECONDS = 45;
/** Vitesse automatique en mode "jusqu'au gros lot". */
const AUTO_RATE_JACKPOT: Rate = 100_000;

type SpeedChoice = 'auto' | Rate;

const PRESETS: { label: string; rate: Rate }[] = [
  { label: '1 / s', rate: 1 },
  { label: '10 / s', rate: 10 },
  { label: '1 000 / s', rate: 1000 },
  { label: '10 000 / s', rate: 10_000 },
  { label: '100 000 / s', rate: 100_000 },
  { label: 'Max', rate: 0 },
];

export function Simulation({ game, grids, optionIds, durationId, onBack, onHome }: Props) {
  const duration = durationById(durationId);
  const [schedule] = useState(() => new Schedule(game.drawOptions.filter((o) => optionIds.includes(o.id))));
  const maxDraws = duration.years === null ? null : schedule.countForYears(duration.years);
  const autoRate: Rate = maxDraws === null ? AUTO_RATE_JACKPOT : Math.max(1, Math.ceil(maxDraws / AUTO_TARGET_SECONDS));
  const [speed, setSpeed] = useState<SpeedChoice>('auto');
  const rate: Rate = speed === 'auto' ? autoRate : speed;

  const [progress, setProgress] = useState<Progress | null>(null);
  const [events, setEvents] = useState<WinEvent[]>([]);
  const [showModal, setShowModal] = useState(true);
  const [showNoPlay, setShowNoPlay] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  /** Gains cumulés au fil du temps, pour le graphique "Et si tu n'avais pas joué ?". */
  const samplesRef = useRef<WonSample[]>([]);

  const ranksPerGrid = useMemo(() => grids.map((g) => game.ranks(g.settings)), [game, grids]);
  const costPerDraw = grids.reduce((s, g) => s + g.settings.stake, 0);
  const withTime = schedule.slots.some((s, i, all) => all.findIndex((o) => o.weekday === s.weekday) !== i);

  const pJackpot = useMemo(() => jackpotProbability(game, grids), [game, grids]);
  const expectedDraws = 1 / pJackpot;
  const yearsPerDraw = (7 * 1440) / MINUTES_PER_YEAR / schedule.perWeek;
  const expectedYears = expectedDraws * yearsPerDraw;
  // Échelle de la frise : la durée choisie, ou largement au-delà de la moyenne.
  const timelineMaxYears = duration.years ?? Math.max(1000, expectedYears * 10);

  useEffect(() => {
    const worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<Progress>) => {
      const p = e.data;
      setProgress(p);
      if (p.draws > 0) {
        const samples = samplesRef.current;
        const yearsAt = (schedule.minuteOf(p.draws - 1) - schedule.startMinute) / MINUTES_PER_YEAR;
        if (!samples.length || samples[samples.length - 1].years < yearsAt) {
          samples.push({ years: yearsAt, won: p.won.reduce((a, b) => a + b, 0) });
          // On garde au plus ~500 points : un sur deux quand on dépasse.
          if (samples.length > 1000) samplesRef.current = samples.filter((_, i) => i % 2 === 1);
        }
      }
      if (p.events.length) setEvents((prev) => [...p.events.slice().reverse(), ...prev].slice(0, 30));
    };
    const msg: ToWorker = {
      type: 'init',
      gameId: game.id,
      grids: grids.map((g) => ({ picks: g.picks, settings: g.settings })),
      jackpotFactors: schedule.slots.map((s) => s.jackpotFactor ?? 1),
      rate: autoRate,
      maxDraws,
      statistical: duration.statistical,
    };
    worker.postMessage(msg);
    return () => worker.terminate();
    // La simulation est lancée une seule fois par montage (la clé du composant change à chaque lancement).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = (m: ToWorker) => workerRef.current?.postMessage(m);
  const changeSpeed = (s: SpeedChoice) => {
    setSpeed(s);
    send({ type: 'speed', rate: s === 'auto' ? autoRate : s });
  };

  const draws = progress?.draws ?? 0;
  const running = progress?.running ?? true;
  const finished = progress?.finished ?? false;
  const jackpot = progress?.jackpot ?? null;
  const jackpotCount = progress ? progress.rankCounts.reduce((s, c) => s + (c[0] ?? 0), 0) : 0;
  const currentMinute = draws > 0 ? schedule.minuteOf(draws - 1) : schedule.startMinute;
  const staked = draws * costPerDraw;
  const won = progress ? progress.won.reduce((a, b) => a + b, 0) : 0;
  const balance = won - staked;
  const slow = rate > 0 && rate <= 10;
  const speeds = duration.statistical ? PRESETS.filter((p) => p.rate === 0) : PRESETS;

  // Progression sur la durée choisie.
  const fraction = maxDraws ? draws / maxDraws : 0;
  // À vitesse fixe, la vitesse demandée est plus fiable que la mesure (bruitée aux faibles vitesses),
  // sauf si le moteur n'arrive pas à suivre.
  const measured = progress?.measuredRate ?? 0;
  const effectiveRate = rate > 0 ? (measured > 0 && measured < rate * 0.7 ? measured : rate) : measured;
  const secondsLeft = maxDraws && effectiveRate > 0 ? (maxDraws - draws) / effectiveRate : 0;
  const endMinute = maxDraws ? schedule.minuteOf(Math.max(0, maxDraws - 1)) : 0;

  const elapsedYears = Math.max(0, currentMinute - schedule.startMinute) / MINUTES_PER_YEAR;
  const openNoPlay = () => {
    setShowModal(false);
    setShowNoPlay(true);
    window.scrollTo({ top: 0 });
  };

  if (showNoPlay) {
    return (
      <div className="sim" style={{ '--accent': game.color } as React.CSSProperties}>
        <NoPlay
          years={elapsedYears}
          staked={staked}
          won={won}
          samples={samplesRef.current}
          onClose={() => setShowNoPlay(false)}
        />
      </div>
    );
  }

  return (
    <div className="sim" style={{ '--accent': game.color } as React.CSSProperties}>
      <div className="game-head">
        <h2 className="game-title">{game.name}</h2>
        <p className="muted">
          {grids.length} grille{grids.length > 1 ? 's' : ''} · {schedule.perWeek} tirage{schedule.perWeek > 1 ? 's' : ''} par
          semaine · {fmtEur(costPerDraw)} par tirage · {lowerFirst(duration.label)}
          {duration.detail ? ` (${duration.detail})` : ''}
        </p>
      </div>

      <div className="toolbar">
        <div className="toolbar__group">
          <span className="toolbar__label" id="speed-label">
            Vitesse
          </span>
          <div className="segmented" role="group" aria-labelledby="speed-label">
            <button
              type="button"
              className={speed === 'auto' ? 'is-on' : ''}
              onClick={() => changeSpeed('auto')}
              disabled={finished}
              title={duration.statistical ? undefined : `${fmtInt(autoRate)} tirages par seconde`}
            >
              Auto
            </button>
            {speeds.map((s) => (
              <button
                key={s.label}
                type="button"
                className={speed === s.rate ? 'is-on' : ''}
                onClick={() => changeSpeed(s.rate)}
                disabled={finished}
              >
                {s.label}
              </button>
            ))}
          </div>
          {!finished &&
            (running ? (
              <button type="button" className="btn btn--primary" onClick={() => send({ type: 'pause' })}>
                Pause
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={() => send({ type: 'resume' })}>
                Reprendre
              </button>
            ))}
          {finished && (
            <button type="button" className="btn btn--primary" onClick={openNoPlay}>
              Et si tu n’avais pas joué ?
            </button>
          )}
        </div>
        <div className="toolbar__group">
          <button type="button" className="btn btn--link" onClick={onBack}>
            Modifier mes grilles
          </button>
          <button type="button" className="btn btn--link" onClick={onHome}>
            Accueil
          </button>
        </div>
      </div>

      {maxDraws !== null && (
        <section className="duration-bar">
          <div className="duration-bar__text">
            <span>
              <strong>{(fraction * 100).toLocaleString('fr-FR', { maximumFractionDigits: fraction < 0.1 ? 1 : 0 })} %</strong> de la durée simulée · fin le{' '}
              {formatMinute(endMinute, withTime)}
            </span>
            <span className="muted">
              {finished
                ? 'Terminé'
                : !running
                  ? 'En pause'
                  : secondsLeft > 0.5
                    ? `encore ~${fmtSeconds(secondsLeft)}`
                    : 'presque fini…'}
              {duration.statistical && ' · mode statistique'}
            </span>
          </div>
          <div className="progress progress--big">
            <div className="progress__fill" style={{ width: `${Math.min(100, fraction * 100)}%` }} />
          </div>
        </section>
      )}

      <div className="stats">
        <Stat label="Tirages effectués" {...bigStat(draws, fmtInt(draws), fmtBig(draws))} />
        <Stat
          label="Vitesse"
          value={finished ? 'Terminé' : running ? `${fmtBig(Math.round(effectiveRate))} / s` : 'En pause'}
        />
        <Stat label="Total misé" {...bigStat(staked, fmtEur(staked), fmtEurBig(staked))} />
        <Stat label="Total gagné" {...bigStat(won, fmtEur(won), fmtEurBig(won))} />
        <Stat label="Solde" {...bigStat(balance, fmtEur(balance), fmtEurBig(balance))} tone={balance >= 0 ? 'good' : 'bad'} />
      </div>

      <TimeTravel
        startMinute={schedule.startMinute}
        currentMinute={currentMinute}
        withTime={withTime}
        expectedYears={expectedYears}
        maxYears={timelineMaxYears}
        running={running && !finished}
      />

      <section className="odds-bar">
        {maxDraws === null ? (
          <>
            <div className="odds-bar__text">
              <span>
                Chance de toucher le gros lot à chaque tirage : <strong>{fmtOdds(pJackpot)}</strong>. Il faut en moyenne{' '}
                <strong>{fmtBig(Math.round(expectedDraws))}</strong> tirages, soit environ{' '}
                <strong>{fmtInt(expectedYears)} ans</strong>.
              </span>
              <span>
                Probabilité d’avoir déjà gagné à ce stade : <strong>{pct(probabilityWithin(pJackpot, draws))}</strong>
              </span>
            </div>
            <div className="progress">
              <div className="progress__fill" style={{ width: `${Math.min(100, probabilityWithin(pJackpot, draws) * 100)}%` }} />
            </div>
          </>
        ) : (
          <div className="odds-bar__text">
            <span>
              Sur cette durée, la probabilité de toucher au moins une fois le gros lot était de{' '}
              <strong>{chance(probabilityWithin(pJackpot, maxDraws))}</strong>
              {maxDraws * pJackpot >= 0.5 && (
                <>
                  , pour <strong>{fmtBig(Math.round(maxDraws * pJackpot))}</strong> gros lot
                  {maxDraws * pJackpot >= 1.5 ? 's' : ''} en moyenne
                </>
              )}
              .
            </span>
            <span className={jackpotCount > 0 ? 'jackpot-count is-on' : 'jackpot-count'}>
              Gros lots gagnés : <strong>{fmtInt(jackpotCount)}</strong>
              {jackpot && !duration.statistical && (
                <span className="muted"> · le premier le {formatMinute(schedule.minuteOf(jackpot.drawIndex), withTime)}</span>
              )}
            </span>
          </div>
        )}
      </section>

      <div className="sim__cols">
        <section>
          <h3>
            {duration.statistical ? 'Un tirage pris au hasard' : 'Dernier tirage'}{' '}
            {draws > 0 && !duration.statistical && <span className="muted">n° {fmtInt(draws)}</span>}
          </h3>
          <div className={`draw ${slow ? 'is-slow' : ''}`} key={slow ? draws : 'fast'}>
            {game.pools.map((pool, pi) => (
              <div key={pool.key} className="ball-row">
                {(progress?.lastDraw[pi] ?? []).map((v, k) => (
                  <Ball
                    key={v}
                    pool={pool}
                    value={v}
                    size="md"
                    animate={slow}
                    delay={slow ? k * (rate === 1 ? 60 : 15) : undefined}
                    highlight={grids.some((g) => g.picks[pi].includes(v))}
                  />
                ))}
              </div>
            ))}
          </div>

          <h3>Tes grilles</h3>
          <ul className="my-grids">
            {grids.map((g, gi) => {
              const r = progress?.lastRanks[gi] ?? -1;
              return (
                <li key={g.id} className={r >= 0 ? 'is-win' : ''}>
                  <span className="my-grids__name">Grille {gi + 1}</span>
                  <span className="ball-row ball-row--tight">
                    {game.pools.map((pool, pi) =>
                      g.picks[pi]
                        .slice()
                        .sort((a, b) => a - b)
                        .map((v) => (
                          <Ball key={`${pi}-${v}`} pool={pool} value={v} size="sm" selected={progress?.lastDraw[pi]?.includes(v)} />
                        )),
                    )}
                  </span>
                  <span className="my-grids__result">{r >= 0 ? `Rang ${r + 1}` : '—'}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3>Gros gains</h3>
          {duration.statistical ? (
            <p className="muted">Pas de détail tirage par tirage en mode statistique : voir le récapitulatif.</p>
          ) : events.length === 0 ? (
            <p className="muted">Aucun gain de 1 000 € ou plus pour l’instant.</p>
          ) : (
            <ul className="events">
              {events.map((ev) => (
                <li key={`${ev.drawIndex}-${ev.gridIndex}-${ev.rank}`} className={ev.rank === 0 ? 'is-jackpot' : ''}>
                  <span className="events__prize">{fmtEur(ev.prize)}</span>
                  <span>
                    Grille {ev.gridIndex + 1} · rang {ev.rank + 1} ({ranksPerGrid[ev.gridIndex][ev.rank].label})
                  </span>
                  <span className="muted">{formatMinute(schedule.minuteOf(ev.drawIndex), withTime)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Recap game={game} grids={grids} ranksPerGrid={ranksPerGrid} progress={progress} />

      <p className="muted small">
        Montants : {game.sources.join(' · ')}. Les gains marqués « ~ » sont des moyennes observées : les vrais montants varient
        d’un tirage à l’autre.
      </p>

      {finished && showModal && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__box">
            {maxDraws === null && jackpot ? (
              <>
                <h2>Gros lot</h2>
                <p>
                  La grille {jackpot.gridIndex + 1} remporte <strong>{fmtEur(jackpot.prize)}</strong> au tirage n°{' '}
                  {fmtInt(jackpot.drawIndex + 1)}, le{' '}
                  <strong>{formatMinute(schedule.minuteOf(jackpot.drawIndex), withTime)}</strong>.
                </p>
                <p>
                  Il aura fallu attendre{' '}
                  <strong>{formatDuration(Math.max(0, schedule.minuteOf(jackpot.drawIndex) - schedule.startMinute))}</strong>,
                  miser <strong>{fmtEurBig(staked)}</strong> et gagner au total <strong>{fmtEurBig(won)}</strong>.
                </p>
              </>
            ) : (
              <>
                <h2>Bilan : {lowerFirst(duration.label)}</h2>
                <p>
                  <strong>{fmtBig(draws)}</strong> tirages joués, du {formatMinute(schedule.minuteOf(0), false)} au{' '}
                  {formatMinute(currentMinute, false)}.
                </p>
                <p>
                  Misé : <strong>{fmtEurBig(staked)}</strong> · gagné : <strong>{fmtEurBig(won)}</strong>
                </p>
                <p>
                  {jackpotCount > 0 ? (
                    <>
                      Gros lot gagné <strong>{fmtBig(jackpotCount)} fois</strong>.
                    </>
                  ) : (
                    <>
                      Gros lot jamais gagné. La probabilité de le toucher sur cette durée était de{' '}
                      <strong>{chance(probabilityWithin(pJackpot, draws))}</strong>.
                    </>
                  )}
                </p>
              </>
            )}
            <p className={`modal__balance ${balance >= 0 ? 'good' : 'bad'}`}>
              Solde final : <strong>{fmtEurBig(balance)}</strong>
              {staked > 0 && <span className="small"> ({fmtInt((won / staked) * 100)} % des mises redistribuées)</span>}
            </p>
            <button type="button" className="btn btn--primary modal__noplay" onClick={openNoPlay}>
              Et si tu n’avais pas joué ?
            </button>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>
                Voir le détail
              </button>
              <button type="button" className="btn btn--ghost" onClick={onHome}>
                Changer de jeu
              </button>
              <button type="button" className="btn btn--primary" onClick={onBack}>
                Rejouer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Valeur d'une tuile : exacte jusqu'au milliard, puis en toutes lettres
 * ("566,5 milliards") avec la valeur exacte en dessous.
 */
function bigStat(n: number, exact: string, words: string): { value: string; sub?: string } {
  if (Math.abs(n) >= 1e9) return { value: words, sub: exact };
  return { value: exact, sub: Math.abs(n) >= 1e6 ? words : undefined };
}

/** "1 chance sur 121 457" pour les petites probabilités, sinon un pourcentage. */
function chance(p: number): string {
  return p < 0.001 ? `1 chance sur ${fmtInt(1 / p)}` : pct(p);
}

function pct(p: number): string {
  if (p >= 0.9995) return '100 %';
  if (p < 0.0001) return '< 0,01 %';
  return `${(p * 100).toLocaleString('fr-FR', { maximumFractionDigits: p < 0.1 ? 2 : 1 })} %`;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <div className="label">{label}</div>
      <div className="stat__value">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

interface RecapProps {
  game: GameDef;
  grids: Grid[];
  ranksPerGrid: ReturnType<GameDef['ranks']>[];
  progress: Progress | null;
}

/** Tableau des rangs : une table par groupe de grilles ayant les mêmes réglages (Keno). */
function Recap({ game, grids, ranksPerGrid, progress }: RecapProps) {
  const groups = new Map<string, number[]>();
  grids.forEach((g, i) => {
    const k = `${g.settings.picks}|${g.settings.stake}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });

  return (
    <section className="recap">
      <h3>Récapitulatif des gains</h3>
      {[...groups.values()].map((idxs) => {
        const g0 = grids[idxs[0]];
        const ranks = ranksPerGrid[idxs[0]];
        const mult = game.prizeScalesWithStake ? g0.settings.stake : 1;
        return (
          <div key={idxs.join(',')} className="table-wrap">
            {groups.size > 1 && (
              <p className="muted">
                {g0.settings.picks} numéros cochés, mise de {fmtEur(g0.settings.stake)}
              </p>
            )}
            <table>
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Combinaison</th>
                  <th className="num">Probabilité</th>
                  <th className="num">Gain</th>
                  {idxs.map((i) => (
                    <th key={i} className="num">
                      Grille {i + 1}
                    </th>
                  ))}
                  {idxs.length > 1 && <th className="num">Total</th>}
                </tr>
              </thead>
              <tbody>
                {ranks.map((r, ri) => {
                  const counts = idxs.map((i) => progress?.rankCounts[i]?.[ri] ?? 0);
                  const total = counts.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={ri} className={total > 0 ? 'has-hits' : ''}>
                      <td>{ri + 1}</td>
                      <td>{r.label}</td>
                      <td className="num">{fmtOdds(rankProbability(game, g0.settings, r))}</td>
                      <td className="num" title={r.prizeNote}>
                        {r.average ? '~ ' : ''}
                        {fmtEur(r.prize * mult)}
                        {r.usesJackpotFactor ? ' à ' + fmtEur(r.prize * mult * 7) : ''}
                        {r.prizeNote && <span className="info"> ⓘ</span>}
                      </td>
                      {counts.map((c, k) => (
                        <td key={k} className="num">
                          {c ? fmtInt(c) : '·'}
                        </td>
                      ))}
                      {idxs.length > 1 && <td className="num strong">{total ? fmtInt(total) : '·'}</td>}
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td colSpan={4}>Gains cumulés</td>
                  {idxs.map((i) => (
                    <td key={i} className="num">
                      {fmtEur(progress?.won[i] ?? 0)}
                    </td>
                  ))}
                  {idxs.length > 1 && (
                    <td className="num strong">{fmtEur(idxs.reduce((s, i) => s + (progress?.won[i] ?? 0), 0))}</td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}
