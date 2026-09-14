// FIXTURE NEGATIVO — este archivo DEBE fallar al verificar tipos.
// Intenta alcanzar desde la superficie por defecto del motor lo que da acceso a información
// oculta: el estado autoritativo y el de ronda (la carta de cada rival, la robada, el mazo)
// y la semilla con todo lo que baraja (con la semilla se calcula el mazo de cualquier
// ronda). Si algún día compila, la frontera del ADR 0005 se rompió y la prueba se pone roja.
import type {
  GameState,
  InvalidSeed,
  Random,
  Round,
  RoundPlayer,
  Seed,
  Turn,
} from '@loveletter/engine';
import { handOf, roundRandom, shuffle, shuffleRound, toSeed } from '@loveletter/engine';

export const leak: GameState | InvalidSeed | Random | Round | RoundPlayer | Seed | Turn | undefined =
  undefined;
export const leakAccessors = [handOf, roundRandom, shuffle, shuffleRound, toSeed];
