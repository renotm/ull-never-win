import { useMemo } from 'react';
import { formatDuration, MINUTES_PER_YEAR } from '../lib/calendar';
import { fmtBig, fmtEur, fmtEurBig, fmtInt } from '../lib/format';
import { COSMIC, LDDS_CAP, LIVRET_A_CAP, LIVRET_RATE, PURCHASES, amount, computeSavings, type Amount } from '../lib/savings';

export interface WonSample {
  years: number;
  won: number;
}

interface Props {
  years: number;
  staked: number;
  won: number;
  samples: WonSample[];
  onClose: () => void;
}

/** log10 de la richesse des ménages de la planète, pour les comparaisons astronomiques. */
const WORLD_WEALTH_LOG = Math.log10(450e12);

export function NoPlay({ years, staked, won, samples, onClose }: Props) {
  const s = useMemo(() => computeSavings(years, staked), [years, staked]);
  const astronomical = s.total.log10 >= 15;
  const interests: Amount = astronomical ? s.livrets : amount(Math.max(0, s.total.value - staked));
  const diff = s.total.value - won; // Infinity si astronomique
  const balance = won - staked;

  return (
    <div className="noplay">
      <div className="game-head">
        <h2 className="game-title">Et si tu n’avais pas joué ?</h2>
        <p className="muted">
          Les mêmes sommes, mises de côté à chaque tirage pendant {formatDuration(years * MINUTES_PER_YEAR)}, sur un Livret A
          puis un LDDS.
        </p>
        <button type="button" className="btn btn--link" onClick={onClose}>
          Retour à la simulation
        </button>
      </div>

      <div className="versus">
        <section className="versus__col versus__col--play">
          <h3>En jouant</h3>
          <div className="versus__amount">{fmtEurBig(won)}</div>
          <p className="muted">gagnés au total</p>
          <dl className="versus__details">
            <dt>Misé</dt>
            <dd>{fmtEurBig(staked)}</dd>
            <dt>Solde</dt>
            <dd className={balance >= 0 ? 'good' : 'bad'}>{fmtEurBig(balance)}</dd>
          </dl>
        </section>

        <section className="versus__col versus__col--save">
          <h3>Sans jouer</h3>
          <div className="versus__amount">
            <BigEur a={s.total} />
          </div>
          <p className="muted">d’épargne à la fin</p>
          <dl className="versus__details">
            <dt>Versé sur les livrets</dt>
            <dd>{fmtEurBig(s.depositedLivrets)}</dd>
            <dt>Intérêts</dt>
            <dd className="good">
              +<BigEur a={interests} />
            </dd>
            {s.cash > 0 && (
              <>
                <dt>Resté sur le compte courant</dt>
                <dd>{fmtEurBig(s.cash)}</dd>
              </>
            )}
            {s.fullAfterYears !== null && (
              <>
                <dt>Livrets pleins après</dt>
                <dd>{fmtInt(Math.ceil(s.fullAfterYears))} ans</dd>
              </>
            )}
          </dl>
        </section>
      </div>

      <p className="verdict">
        {diff >= 0 ? (
          <>
            Ne pas jouer t’aurait laissé{' '}
            <strong>{astronomical ? <BigEur a={s.total} /> : fmtEurBig(diff)}</strong> de plus.
          </>
        ) : (
          <>
            Cette fois, jouer a rapporté <strong>{fmtEurBig(-diff)}</strong> de plus que l’épargne.
          </>
        )}
      </p>

      {astronomical && <Cosmic total={s.total} />}

      {s.curve && s.curve.length > 1 && <Chart curve={s.curve} samples={samples} years={years} />}

      <section>
        <h3>Avec cette épargne, tu aurais pu t’offrir</h3>
        <div className="table-wrap">
          <table className="purchases">
            <thead>
              <tr>
                <th></th>
                <th className="num">Prix</th>
                <th className="num">Quantité</th>
              </tr>
            </thead>
            <tbody>
              {PURCHASES.map((p) => {
                const countLog = s.total.log10 - Math.log10(p.price);
                const affordable = countLog >= 0;
                return (
                  <tr key={p.label} className={affordable ? '' : 'is-out'}>
                    <td>{p.label}</td>
                    <td className="num">{fmtEurBig(p.price)}</td>
                    <td className="num">
                      {affordable ? <Count log10={countLog} /> : `il manque ${fmtEurBig(p.price - s.total.value)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="muted small">
        Livret A ({fmtEur(LIVRET_A_CAP)} de plafond) puis LDDS ({fmtEur(LDDS_CAP)}), à{' '}
        {(LIVRET_RATE * 100).toLocaleString('fr-FR')} % net (taux d’août 2026), supposé constant. Intérêts capitalisés chaque
        année : ils peuvent dépasser le plafond, mais on ne peut plus verser une fois celui-ci atteint ; le reste va sur un compte
        courant non rémunéré. Les gains du joueur ne sont pas placés. Sans inflation, prix indicatifs en euros d’aujourd’hui.
      </p>
    </div>
  );
}

/** Montant en euros, avec puissance de 10 au-delà de 10^15. */
export function BigEur({ a }: { a: Amount }) {
  if (a.log10 < 15) return <>{fmtEurBig(a.value)}</>;
  return (
    <>
      <Pow log10={a.log10} /> €
    </>
  );
}

function Count({ log10 }: { log10: number }) {
  if (log10 < 15) {
    const n = Math.floor(Math.pow(10, log10) + 1e-9);
    return <>{n >= 1e6 ? fmtBig(n) : fmtInt(n)}</>;
  }
  return (
    <Pow log10={log10} />
  );
}

/** 3,2 × 10^7 384 */
function Pow({ log10 }: { log10: number }) {
  const exp = Math.floor(log10);
  const mant = Math.pow(10, log10 - exp);
  return (
    <span className="pow">
      {mant.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} × 10<sup>{fmtInt(exp)}</sup>
    </span>
  );
}

function Cosmic({ total }: { total: Amount }) {
  const reached = COSMIC.filter((c) => total.log10 >= c.log10);
  const timesWorld = total.log10 - WORLD_WEALTH_LOG;
  return (
    <section className="cosmic">
      <h3>Intérêts composés</h3>
      <p>
        À 1,7 % par an sur une telle durée, les livrets atteignent{' '}
        <strong>
          <BigEur a={total} />
        </strong>
        , soit <Pow log10={timesWorld} /> fois toute la richesse des ménages de la planète.
      </p>
      {reached.length > 0 && (
        <ul>
          {reached.map((c) => (
            <li key={c.log10}>C’est {withPowers(c.text)}.</li>
          ))}
        </ul>
      )}
      <p className="muted small">Calcul purement théorique : aucun placement ne dure aussi longtemps.</p>
    </section>
  );
}

/** Affiche les "10^80" d'un texte en exposant. */
function withPowers(text: string) {
  return text.split(/10\^(\d+)/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i}>
        10<sup>{part}</sup>
      </span>
    ) : (
      part
    ),
  );
}

/* ---------- Graphique ---------- */

interface ChartProps {
  curve: { years: number; total: number }[];
  samples: WonSample[];
  years: number;
}

const W = 640;
const H = 240;
const PAD = { l: 64, r: 12, t: 12, b: 28 };

function Chart({ curve, samples, years }: ChartProps) {
  const maxY = Math.max(...curve.map((p) => p.total), ...samples.map((p) => p.won), 1);
  const x = (y: number) => PAD.l + (y / years) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
  const line = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
  const playerPts: [number, number][] = [[0, 0], ...samples.map((p) => [p.years, p.won] as [number, number])];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <section>
      <h3>Évolution dans le temps</h3>
      <div className="chart-legend">
        <span className="chart-legend__item chart-legend__item--save">Sans jouer : épargne</span>
        <span className="chart-legend__item chart-legend__item--play">En jouant : gains cumulés</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Épargne et gains cumulés au fil du temps">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={PAD.l - 6} y={y(t) + 4} className="chart__label" textAnchor="end">
              {compactEur(t)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 8} className="chart__label">
          0
        </text>
        <text x={W - PAD.r} y={H - 8} className="chart__label" textAnchor="end">
          {fmtInt(years)} an{years >= 2 ? 's' : ''}
        </text>
        <path d={line(curve.map((p) => [p.years, p.total]))} className="chart__line chart__line--save" />
        <path d={line(playerPts)} className="chart__line chart__line--play" />
      </svg>
    </section>
  );
}

function compactEur(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Md€`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  return `${Math.round(v)} €`;
}
