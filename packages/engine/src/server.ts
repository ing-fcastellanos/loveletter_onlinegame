/**
 * Superficie de autoridad — `@loveletter/engine/server`.
 *
 * Publica el estado autoritativo y las operaciones que lo transforman. Solo la
 * consumen `services/api` y las pruebas del motor; `apps/web` jamás (ADR 0005).
 * Este archivo es un barril; no debe contener lógica.
 */

export { CARD } from './cards.ts';
export type { CardName, CardValue } from './cards.ts';
export { project } from './state.ts';
export type { PlayerId, PlayerView, Command, GameState } from './state.ts';
