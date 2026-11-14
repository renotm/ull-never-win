import { useMemo } from 'react';
import { civilFromDays, formatDuration, formatMinute, MINUTES_PER_YEAR } from '../lib/calendar';
import { fmtInt } from '../lib/format';

interface Milestone {
  years: number;
  label: string;
  /** Formulation complète pour les durées courtes ("plus d’un mois"). */
  phrase?: string;
}

function milestones(currentYear: number): Milestone[] {
  return [
    { years: 7 / 365.2425, label: 'une semaine', phrase: 'plus d’une semaine' },
    { years: 1 / 12, label: 'un mois', phrase: 'plus d’un mois' },
    { years: 0.25, label: 'trois mois', phrase: 'plus de trois mois' },
    { years: 0.5, label: 'six mois', phrase: 'plus de six mois' },
    { years: 1, label: 'une année', phrase: 'plus d’un an' },
    { years: 5, label: 'cinq ans', phrase: 'plus de 5 ans' },
    { years: 10, label: 'une décennie', phrase: 'plus de 10 ans' },
    { years: 25, label: 'une génération', phrase: 'plus longtemps qu’une génération (25 ans)' },
    { years: 50, label: 'un demi-siècle', phrase: 'plus d’un demi-siècle' },
    { years: 80, label: 'une vie humaine', phrase: 'plus longtemps qu’une vie humaine (80 ans)' },
    { years: currentYear - 1789, label: 'la Révolution française' },
    { years: currentYear - 1492, label: 'l’arrivée de Christophe Colomb en Amérique' },
    { years: currentYear - 800, label: 'le sacre de Charlemagne' },
    { years: currentYear, label: 'la naissance de Jésus-Christ' },
    { years: 4_500, label: 'la construction des pyramides de Gizeh' },
    { years: 5_300, label: 'l’invention de l’écriture' },
    { years: 11_700, label: 'la fin de la dernière glaciation' },
    { years: 18_000, label: 'les peintures de Lascaux' },
    { years: 40_000, label: 'la disparition de Néandertal' },
    { years: 300_000, label: 'l’apparition d’Homo sapiens' },
    { years: 3_200_000, label: 'Lucy, l’australopithèque' },
    { years: 66_000_000, label: 'la disparition des dinosaures' },
    { years: 230_000_000, label: 'l’apparition des dinosaures' },
    { years: 540_000_000, label: 'l’explosion cambrienne' },
    { years: 3_700_000_000, label: 'les premières traces de vie' },
    { years: 4_540_000_000, label: 'la formation de la Terre' },
    { years: 13_800_000_000, label: 'le Big Bang' },
  ];
}

const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface Props {
  startMinute: number;
  /** Minute du dernier tirage effectué (ou du départ). */
  currentMinute: number;
  withTime: boolean;
  /** Durée moyenne (en années) pour gagner le rang 1. */
  expectedYears: number;
  /** Fin de l'échelle de la frise (années). */
  maxYears: number;
  running: boolean;
}

export function TimeTravel({ startMinute, currentMinute, withTime, expectedYears, maxYears, running }: Props) {
  const startYear = civilFromDays(Math.floor(startMinute / 1440)).year;
  const ms = useMemo(
    () =>
      milestones(startYear)
        .filter((m) => m.years <= maxYears * 1.0001)
        .sort((a, b) => a.years - b.years),
    [startYear, maxYears],
  );
  const elapsedMin = Math.max(0, currentMinute - startMinute);
  const years = elapsedMin / MINUTES_PER_YEAR;
  const passed = ms.filter((m) => years >= m.years);
  const next = ms.find((m) => years < m.years);
  const last = passed[passed.length - 1];

  // Échelle logarithmique d'un jour à la fin de la durée simulée.
  const minYears = 1 / 365.2425;
  const minLog = Math.log10(minYears);
  const maxLog = Math.log10(maxYears);
  const pos = (y: number) => Math.min(100, Math.max(0, ((Math.log10(Math.max(y, minYears)) - minLog) / (maxLog - minLog)) * 100));

  const c = civilFromDays(Math.floor(currentMinute / 1440));
  const dayOfYear = (c.month - 1) / 12 + (c.day - 1) / 365;
  const generations = Math.floor(years / 25);

  return (
    <section className="card time-travel">
      <div className="time-travel__top">
        <div className={`year-dial ${running ? 'is-running' : ''}`} aria-hidden="true">
          <svg viewBox="-50 -50 100 100">
            <circle r="46" className="year-dial__ring" />
            {MONTHS_SHORT.map((m, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
              return (
                <text key={i} x={Math.cos(a) * 37} y={Math.sin(a) * 37 + 3} className="year-dial__month">
                  {m}
                </text>
              );
            })}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-28"
              className="year-dial__hand"
              transform={`rotate(${dayOfYear * 360})`}
            />
            <circle r="3" className="year-dial__pin" />
          </svg>
        </div>
        <div className="time-travel__dates">
          <div className="label">Date du dernier tirage</div>
          <div className="big-date">{formatMinute(currentMinute, withTime)}</div>
          <div className="label">Temps écoulé depuis le premier tirage</div>
          <div className="duration">{formatDuration(elapsedMin)}</div>
          {generations >= 1 && (
            <div className="generations">
              👨‍👩‍👧 {generations === 1 ? 'Ce sont tes enfants qui jouent' : `${fmtInt(generations)} générations ont joué à ta place`}
            </div>
          )}
        </div>
      </div>

      <div className="timeline">
        <div className="timeline__track">
          <div className="timeline__fill" style={{ width: `${pos(years)}%` }} />
          {expectedYears > 0 && expectedYears <= maxYears && (
            <div className="timeline__expected" style={{ left: `${pos(expectedYears)}%` }} title="Durée moyenne pour gagner le rang 1">
              <span>moyenne</span>
            </div>
          )}
          {ms.map((m) => (
            <div
              key={m.label}
              className={`timeline__tick ${years >= m.years ? 'is-passed' : ''}`}
              style={{ left: `${pos(m.years)}%` }}
              title={`${m.years < 1 ? '' : fmtYears(m.years) + ' : '}${m.label}`}
            />
          ))}
        </div>
        <div className="timeline__caption">
          {last ? (
            <>
              Tu joues depuis <strong>{m2s(last)}</strong>
            </>
          ) : (
            <>C’est parti…</>
          )}
          {next && (
            <span className="muted">
              {' '}
              · prochain repère : {next.phrase ? next.label : `${next.label} (${fmtYears(next.years)})`}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function m2s(m: Milestone): string {
  return m.phrase ?? `plus longtemps que le temps écoulé depuis ${m.label} (${fmtYears(m.years)})`;
}

function fmtYears(y: number): string {
  if (y >= 1e9) return `${(y / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} milliards d’années`;
  if (y >= 1e6) return `${(y / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} millions d’années`;
  return `${fmtInt(y)} ans`;
}
