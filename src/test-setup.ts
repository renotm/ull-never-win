// Node 16 n'expose pas crypto en global (les navigateurs, si).
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
