/**
 * Seeded randomness for the host-authoritative table [ID: LOGIC-TABLETOP-RNG]
 *
 * ADR-0005: random results (dice, shuffle order, spinner, spawned ids) are decided on the host
 * and travel in the delta. The host stamps a seed on each action (`hostActions.ts`); the reducer
 * draws from that seed, so applying the same action to the same state gives the same table.
 */

/** Returns a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

/** mulberry32: small, fast, good enough for games (not for secrets). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh 32-bit seed (crypto when available). */
export function newSeed(): number {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296);
}

/** Fisher–Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const rollValue = (sides: number, rng: Rng): number =>
  Math.floor(rng() * Math.max(1, sides)) + 1;

/** Id for a piece spawned from an infinite bag. */
export const spawnId = (rng: Rng): string =>
  `tok_${Math.floor(rng() * 2 ** 32)
    .toString(36)
    .padStart(7, '0')}${Math.floor(rng() * 2 ** 20).toString(36)}`;
