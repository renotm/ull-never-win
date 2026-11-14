import { useState } from 'react';
import { EMPTY_SETUP, Setup, type SetupState } from './components/Setup';
import { Simulation } from './components/Simulation';
import { GAMES } from './games';

export function App() {
  const [setup, setSetup] = useState<SetupState>(EMPTY_SETUP);
  const [simKey, setSimKey] = useState<number | null>(null);
  const game = GAMES.find((g) => g.id === setup.gameId);
  // Retour à l'accueil (choix du jeu) ; on garde seulement la durée choisie.
  const goHome = () => {
    setSimKey(null);
    setSetup({ ...EMPTY_SETUP, duration: setup.duration });
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          <button type="button" className="home-link" onClick={goHome} title="Revenir à l’accueil">
            Simulateur de tirages
          </button>
        </h1>
        <p className="muted">Combien de temps faudrait-il jouer pour décrocher le gros lot ?</p>
      </header>

      <main>
        {simKey !== null && game ? (
          <Simulation key={simKey} game={game} grids={setup.grids} optionIds={setup.options} durationId={setup.duration} onBack={() => setSimKey(null)} onHome={goHome} />
        ) : (
          <Setup state={setup} onChange={setSetup} onLaunch={() => setSimKey(Date.now())} />
        )}
      </main>

      <footer className="app__footer muted small">
        Simulation non officielle, sans lien avec la Française des Jeux. Les tirages sont faits au hasard dans le
        navigateur. Jouer comporte des risques : endettement, dépendance… Appelez le 09 74 75 13 13 (appel non
        surtaxé).
      </footer>
    </div>
  );
}
