/**
 * Superficie de autoridad — `@loveletter/engine/server`.
 *
 * Publica el estado autoritativo y las operaciones que lo transforman. Solo la consumen
 * `services/api` y las pruebas del motor; `apps/web` jamás (ADR 0005). Este archivo es un
 * barril; no debe contener lógica.
 */

export { CARD } from './cards.ts';
export type { CardName, CardValue } from './cards.ts';
export { ok, err } from './result.ts';
export type { Result } from './result.ts';
export type { RuleViolation } from './violation.ts';
export { handOf } from './state.ts';
export type {
  PlayerId,
  Player,
  Hand,
  ActivePlayer,
  EliminatedPlayer,
  RoundPlayer,
  Turn,
  Round,
  GameState,
} from './state.ts';
export { project } from './view.ts';
export type { PlayerView } from './view.ts';
export type { Command } from './command.ts';
