import { crescendo } from './crescendo';
import { eurodreams } from './eurodreams';
import { euromillions } from './euromillions';
import { keno } from './keno';
import { loto } from './loto';
import type { GameDef } from './types';

export const GAMES: GameDef[] = [loto, euromillions, eurodreams, keno, crescendo];
