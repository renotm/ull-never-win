# Simulateur de tirages

Combien de temps faudrait-il jouer pour gagner le gros lot ? Cette appli simule les tirages des jeux de la FDJ (Loto, EuroMillions, EuroDreams, Keno, Crescendo) jusqu'à ce qu'une de tes grilles gagne le rang 1.

Avant de lancer, on choisit la durée simulée : de 1 an à l'âge de l'Univers, ou « jusqu'au gros lot ». En vitesse automatique, l'animation dure environ 45 secondes quelle que soit la durée.

Elle est 100 % statique : tout se passe dans le navigateur et rien n'est sauvegardé.

## Commandes

Il faut Node 16 ou plus.

- `npm install` : installe les dépendances.
- `npm run dev` : lance le serveur de développement.
- `npm test` : vérifie les probabilités de chaque rang par rapport aux règlements FDJ, et le moteur.
- `npm run build` : produit les fichiers statiques dans `dist/`.
- `npm run preview` : sert `dist/` en local.

`dist/` doit être servi par un serveur web, par exemple GitHub Pages, Netlify ou `npx serve dist`. En ouvrant directement `index.html` (adresse `file://`), le navigateur bloque les modules et le Web Worker.

## Mise en ligne

L'appli est publiée sur GitHub Pages : https://renotm.github.io/ull-never-win/

À chaque push sur `master`, le workflow `.github/workflows/deploy.yml` lance les tests, construit l'appli et publie `dist/`. Pour que ça marche, une seule fois : dans GitHub, *Settings → Pages → Build and deployment → Source*, choisir **GitHub Actions**.

## Organisation

- `src/games/` : un fichier par jeu, qui décrit les urnes, les jours de tirage, les mises et la table des rangs et des gains. Pour ajouter un jeu, il suffit d'ajouter un fichier et de le déclarer dans `index.ts`.
- `src/sim/engine.ts` : le moteur de tirage. Il tire sans remise (Fisher-Yates partiel) avec `crypto.getRandomValues`, puis cherche le rang de chaque grille dans une table précalculée.
- `src/sim/worker.ts` : fait tourner le moteur dans un Web Worker, gère la vitesse et la pause.
- Mode statistique (âge de la Terre et de l'Univers, des milliers de milliards de tirages) : au lieu de tirer chaque boule, `Engine.runStatistical` tire directement le nombre de gains de chaque rang, avec une loi multinomiale construite par binomiales successives. Chaque grille est traitée indépendamment.
- `src/lib/calendar.ts` : calendrier maison. Les dates JavaScript s'arrêtent en l'an 275 760, or la simulation peut aller bien plus loin.

## Sources des gains

- Rangs et probabilités : règlements officiels de la FDJ (Loto et EuroMillions de mars 2025, EuroDreams d'octobre 2025, Keno de mars 2026, Crescendo de novembre 2025).
- Gains fixes (Keno, Crescendo, remboursements) : règlements.
- Gains variables (Loto, EuroMillions, EuroDreams rangs 3 à 5) : moyennes calculées sur les résultats officiels FDJ.
