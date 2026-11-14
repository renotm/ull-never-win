import type { GameDef, Grid } from '../games/types';
import { pickCountsFor } from '../lib/odds';
import { pickRandom } from '../lib/random';
import { fmtEur } from '../lib/format';
import { Ball } from './Ball';

interface Props {
  game: GameDef;
  grid: Grid;
  index: number;
  canRemove: boolean;
  onChange: (g: Grid) => void;
  onRemove: () => void;
}

/** Complète les urnes choisies par le joueur sans toucher aux numéros déjà cochés. */
export function flashGrid(game: GameDef, grid: Grid): Grid {
  const counts = pickCountsFor(game, grid.settings);
  const picks = grid.picks.map((sel, i) => {
    const pool = game.pools[i];
    if (!pool.playerChooses) return sel;
    const missing = counts[i] - sel.length;
    return missing > 0 ? [...sel, ...pickRandom(pool.size, missing, sel)] : sel;
  });
  return { ...grid, picks };
}

export function isGridComplete(game: GameDef, grid: Grid): boolean {
  const counts = pickCountsFor(game, grid.settings);
  return grid.picks.every((sel, i) => sel.length === counts[i]);
}

export function newGrid(game: GameDef, id: number): Grid {
  const settings = { picks: game.pickRange ? game.pickCounts[0] : game.pickCounts[0], stake: game.stakes[0] };
  // Les urnes non choisies par le joueur (lettre Crescendo) sont attribuées au hasard.
  const picks = game.pools.map((p, i) => (p.playerChooses ? [] : pickRandom(p.size, game.pickCounts[i])));
  return { id, picks, settings };
}

export function GridEditor({ game, grid, index, canRemove, onChange, onRemove }: Props) {
  const counts = pickCountsFor(game, grid.settings);

  const toggle = (poolIndex: number, value: number) => {
    const sel = grid.picks[poolIndex];
    let next: number[];
    if (sel.includes(value)) next = sel.filter((v) => v !== value);
    else if (sel.length < counts[poolIndex]) next = [...sel, value];
    else return;
    const picks = grid.picks.slice();
    picks[poolIndex] = next;
    onChange({ ...grid, picks });
  };

  const clear = () =>
    onChange({ ...grid, picks: grid.picks.map((sel, i) => (game.pools[i].playerChooses ? [] : sel)) });

  const setPickCount = (n: number) => {
    const picks = grid.picks.slice();
    picks[0] = picks[0].slice(0, n);
    onChange({ ...grid, picks, settings: { ...grid.settings, picks: n } });
  };

  const complete = isGridComplete(game, grid);

  return (
    <section className={`card grid-editor ${complete ? 'is-complete' : ''}`}>
      <header className="grid-editor__head">
        <h3>
          Grille {index + 1}
          {complete && <span className="tag tag--ok">complète</span>}
        </h3>
        <div className="grid-editor__actions">
          <button type="button" className="btn btn--flash" onClick={() => onChange(flashGrid(game, grid))} disabled={complete}>
            ⚡ Flash
          </button>
          <button type="button" className="btn btn--ghost" onClick={clear}>
            Effacer
          </button>
          {canRemove && (
            <button type="button" className="btn btn--ghost btn--danger" onClick={onRemove} aria-label={`Supprimer la grille ${index + 1}`}>
              ✕
            </button>
          )}
        </div>
      </header>

      {game.pickRange && (
        <div className="grid-editor__settings">
          <label>
            Nombre de numéros
            <select value={grid.settings.picks} onChange={(e) => setPickCount(Number(e.target.value))}>
              {Array.from({ length: game.pickRange[1] - game.pickRange[0] + 1 }, (_, i) => game.pickRange![0] + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {game.stakes.length > 1 && (
            <label>
              Mise par tirage
              <select
                value={grid.settings.stake}
                onChange={(e) => onChange({ ...grid, settings: { ...grid.settings, stake: Number(e.target.value) } })}
              >
                {game.stakes.map((s) => (
                  <option key={s} value={s}>
                    {fmtEur(s)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {game.pools.map((pool, pi) => (
        <div key={pool.key} className="grid-editor__pool">
          <div className="grid-editor__pool-head">
            <span>{pool.label}</span>
            {pool.playerChooses ? (
              <span className={grid.picks[pi].length === counts[pi] ? 'count count--ok' : 'count'}>
                {grid.picks[pi].length} / {counts[pi]}
              </span>
            ) : (
              <span className="muted">attribuée au hasard</span>
            )}
          </div>
          {pool.playerChooses ? (
            <div className={`ball-grid ball-grid--${pool.size > 30 ? 'wide' : 'narrow'}`}>
              {Array.from({ length: pool.size }, (_, i) => i + 1).map((v) => {
                const selected = grid.picks[pi].includes(v);
                return (
                  <Ball
                    key={v}
                    pool={pool}
                    value={v}
                    size="sm"
                    selected={selected}
                    disabled={!selected && grid.picks[pi].length >= counts[pi]}
                    onClick={() => toggle(pi, v)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="ball-row">
              {grid.picks[pi].map((v) => (
                <Ball key={v} pool={pool} value={v} selected />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
