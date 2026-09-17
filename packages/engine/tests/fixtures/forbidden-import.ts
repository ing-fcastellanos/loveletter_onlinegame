// FIXTURE NEGATIVO — este archivo DEBE fallar al verificar tipos.
// Intenta alcanzar desde la superficie por defecto del motor lo que da acceso a información
// oculta: el estado autoritativo y el de ronda (la carta de cada rival, la robada, el mazo), la
// semilla con todo lo que baraja (con la semilla se calcula el mazo de cualquier ronda), y la
// preparación, que construye ese estado. Si algún día compila, la frontera del ADR 0005 se
// rompió y la prueba se pone roja.
import type {
  FullDeck,
  GameState,
  InvalidSeed,
  Random,
  Round,
  RoundPlayer,
  Seat,
  Seed,
  SetupViolation,
  Turn,
} from '@loveletter/engine';
import {
  applyCommand,
  dealRound,
  handOf,
  roundRandom,
  shuffle,
  shuffleRound,
  startMatch,
  toSeed,
} from '@loveletter/engine';

export const leak:
  | FullDeck
  | GameState
  | InvalidSeed
  | Random
  | Round
  | RoundPlayer
  | Seat
  | Seed
  | SetupViolation
  | Turn
  | undefined = undefined;
export const leakAccessors = [
  applyCommand,
  dealRound,
  handOf,
  roundRandom,
  shuffle,
  shuffleRound,
  startMatch,
  toSeed,
];
