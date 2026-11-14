import { GAMES } from '../games';
import type { GameDef, Grid } from '../games/types';
import { MINUTES_PER_YEAR, Schedule } from '../lib/calendar';
import { DEFAULT_DURATION, DURATIONS, durationById } from '../lib/durations';
import { fmtBig, fmtEur, fmtEurBig, fmtInt, fmtSeconds, lowerFirst } from '../lib/format';
import { ENGINE_DRAWS_PER_SECOND, jackpotProbability } from '../lib/jackpot';
import { GridEditor, flashGrid, isGridComplete, newGrid } from './GridEditor';

export interface SetupState {
  gameId: string | null;
  grids: Grid[];
  options: string[];
  nextId: number;
  duration: string;
}

export const EMPTY_SETUP: SetupState = { gameId: null, grids: [], options: [], nextId: 1, duration: DEFAULT_DURATION };

interface Props {
  state: SetupState;
  onChange: (s: SetupState) => void;
  onLaunch: () => void;
}

export function initialStateFor(game: GameDef, duration: string): SetupState {
  return { gameId: game.id, grids: [newGrid(game, 1)], options: game.drawOptions.map((o) => o.id), nextId: 2, duration };
}

export function Setup({ state, onChange, onLaunch }: Props) {
  const game = GAMES.find((g) => g.id === state.gameId) ?? null;

  if (!game) {
    return (
      <div className="setup">
        <h2 className="step-title">
          <span className="step-num">1</span> Choisis ton jeu
        </h2>
        <div className="game-list">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className="game-card"
              style={{ '--accent': g.color } as React.CSSProperties}
              onClick={() => onChange(initialStateFor(g, state.duration))}
            >
              <span className="game-card__name">{g.name}</span>
              <span className="game-card__tagline">{g.tagline}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const setGrid = (i: number, g: Grid) => {
    const grids = state.grids.slice();
    grids[i] = g;
    onChange({ ...state, grids });
  };
  const addGrid = () =>
    onChange({ ...state, grids: [...state.grids, newGrid(game, state.nextId)], nextId: state.nextId + 1 });
  const removeGrid = (i: number) => onChange({ ...state, grids: state.grids.filter((_, j) => j !== i) });
  const flashAll = () => onChange({ ...state, grids: state.grids.map((g) => flashGrid(game, g)) });
  const toggleOption = (id: string) =>
    onChange({
      ...state,
      options: state.options.includes(id) ? state.options.filter((o) => o !== id) : [...state.options, id],
    });

  const incomplete = state.grids.filter((g) => !isGridComplete(game, g)).length;
  const drawsPerWeek = game.drawOptions
    .filter((o) => state.options.includes(o.id))
    .reduce((n, o) => n + o.slots.length, 0);
  const costPerDraw = state.grids.reduce((s, g) => s + g.settings.stake, 0);
  const canLaunch = incomplete === 0 && drawsPerWeek > 0 && state.grids.length > 0;

  const duration = durationById(state.duration);
  const schedule = drawsPerWeek > 0 ? new Schedule(game.drawOptions.filter((o) => state.options.includes(o.id))) : null;
  const totalDraws = schedule && duration.years !== null ? schedule.countForYears(duration.years) : null;
  // Estimation pour l'avertissement "jusqu'au gros lot".
  const pJackpot = jackpotProbability(game, state.grids);
  const meanDraws = 1 / pJackpot;
  const meanYears = drawsPerWeek > 0 ? (meanDraws / drawsPerWeek) * ((7 * 1440) / MINUTES_PER_YEAR) : 0;
  const meanSeconds = meanDraws / ENGINE_DRAWS_PER_SECOND;

  return (
    <div className="setup" style={{ '--accent': game.color } as React.CSSProperties}>
      <div className="setup__game">
        <div>
          <h2 className="game-title">{game.name}</h2>
          <p className="muted">{game.tagline}</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => onChange({ ...EMPTY_SETUP, duration: state.duration })}>
          Changer de jeu
        </button>
      </div>

      <h2 className="step-title">
        <span className="step-num">2</span> Remplis tes grilles
        <button type="button" className="btn btn--flash btn--small" onClick={flashAll} disabled={incomplete === 0}>
          ⚡ Flash sur toutes les grilles
        </button>
      </h2>
      <div className="grids">
        {state.grids.map((g, i) => (
          <GridEditor
            key={g.id}
            game={game}
            grid={g}
            index={i}
            canRemove={state.grids.length > 1}
            onChange={(ng) => setGrid(i, ng)}
            onRemove={() => removeGrid(i)}
          />
        ))}
        <button type="button" className="card add-grid" onClick={addGrid}>
          <span className="add-grid__plus">+</span>
          Ajouter une grille
        </button>
      </div>

      <h2 className="step-title">
        <span className="step-num">3</span> Choisis les tirages
      </h2>
      <div className="card draw-options">
        {game.drawOptions.map((o) => (
          <label key={o.id} className={`chip ${state.options.includes(o.id) ? 'is-on' : ''}`}>
            <input type="checkbox" checked={state.options.includes(o.id)} onChange={() => toggleOption(o.id)} />
            {o.label}
          </label>
        ))}
        {game.drawOptions.length > 2 && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onChange({ ...state, options: game.drawOptions.map((o) => o.id) })}
          >
            Tout cocher
          </button>
        )}
      </div>

      <h2 className="step-title">
        <span className="step-num">4</span> Choisis la durée simulée
      </h2>
      <div className="card">
        <div className="draw-options">
          {DURATIONS.map((d) => (
            <label
              key={d.id}
              className={`chip ${state.duration === d.id ? 'is-on' : ''} ${d.years === null ? 'chip--warn' : ''}`}
              title={d.detail}
            >
              <input
                type="radio"
                name="duration"
                checked={state.duration === d.id}
                onChange={() => onChange({ ...state, duration: d.id })}
              />
              {d.years === null && '⚠️ '}
              {d.label}
              {d.detail && <span className="chip__detail">{d.detail}</span>}
            </label>
          ))}
        </div>
        {duration.years === null ? (
          <div className="warning">
            <strong>Attention, ça peut être (très) long.</strong> Avec ces grilles et ces tirages, il faut en moyenne{' '}
            <strong>{fmtBig(Math.round(meanDraws))} tirages</strong>
            {meanYears > 0 && (
              <>
                , soit environ <strong>{fmtInt(meanYears)} ans</strong> de jeu
              </>
            )}{' '}
            et <strong>{meanSeconds < 10 ? 'quelques secondes' : `environ ${fmtSeconds(meanSeconds)}`}</strong> de calcul à vitesse
            maximale. Ce n’est qu’une moyenne : la chance peut tarder bien plus longtemps. Tu pourras mettre en pause ou arrêter
            à tout moment.
          </div>
        ) : (
          duration.statistical && (
            <p className="muted small">
              Durée trop longue pour tirer chaque boule : la simulation passe en <strong>mode statistique</strong> (on tire
              directement le nombre de gains de chaque rang selon les probabilités officielles).
            </p>
          )
        )}
      </div>

      <div className="launch-bar">
        <div className="launch-bar__summary">
          <strong>{state.grids.length}</strong> grille{state.grids.length > 1 ? 's' : ''} ·{' '}
          <strong>{fmtInt(drawsPerWeek)}</strong> tirage{drawsPerWeek > 1 ? 's' : ''} par semaine ·{' '}
          <strong>{fmtEur(costPerDraw * drawsPerWeek)}</strong> par semaine
          {totalDraws !== null && (
            <div>
              Sur {lowerFirst(duration.label)} : <strong>{fmtBig(totalDraws)}</strong>{' '}
              tirages, <strong>{fmtEurBig(totalDraws * costPerDraw)}</strong> misés
            </div>
          )}
          {!canLaunch && (
            <div className="launch-bar__warn">
              {incomplete > 0
                ? `${incomplete} grille${incomplete > 1 ? 's' : ''} incomplète${incomplete > 1 ? 's' : ''}`
                : drawsPerWeek === 0
                  ? 'Choisis au moins un tirage'
                  : ''}
            </div>
          )}
        </div>
        <button type="button" className="btn btn--primary btn--big" disabled={!canLaunch} onClick={onLaunch}>
          ▶ Lancer le jeu
        </button>
      </div>
    </div>
  );
}
