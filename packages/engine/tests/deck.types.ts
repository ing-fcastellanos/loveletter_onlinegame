/**
 * Contratos de tipo de la semilla (capability `deck`, ADR 0008).
 *
 * No se ejecuta: lo verifica `npm run typecheck`. Cada uso de un número sin validar como
 * semilla está escrito como una construcción precedida de `@ts-expect-error`. Si el marcado
 * de `Seed` se afloja, la directiva queda sin uso y el typecheck falla con TS2578.
 *
 * Una sola construcción por directiva, y cada una en una sola línea.
 */

import { roundRandom, shuffleRound, toSeed } from '@loveletter/engine/server';
import type { GameState, Seed } from '@loveletter/engine/server';

/** Este archivo no se ejecuta: basta con declarar que existe un estado de partida. */
declare const estado: GameState;

// ── Lo que se admite compila ─────────────────────────────────────────────────────────────

const validada = toSeed(20260911);

/** La semilla estrechada tras validar se acepta al barajar. */
export const mazo = validada.ok ? shuffleRound(validada.value, 1).deck : [];

// ── Lo que no se admite no compila ───────────────────────────────────────────────────────

// @ts-expect-error: un número sin validar como semilla
export const s1: Seed = 20260911;

// @ts-expect-error: el generador de una ronda con un número sin validar
export const r1 = roundRandom(20260911, 1);

// @ts-expect-error: el barajado de una ronda con un número sin validar
export const d1 = shuffleRound(20260911, 1);

// @ts-expect-error: un estado de partida con una semilla sin validar
export const g1: GameState = { ...estado, seed: 20260911 };
