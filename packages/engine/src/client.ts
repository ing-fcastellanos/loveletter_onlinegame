/**
 * Superficie de cliente — el punto de entrada por defecto de `@loveletter/engine`.
 *
 * Publica únicamente lo que un jugador puede conocer. El estado de ronda (`Round`,
 * `RoundPlayer`, `Turn`) y el estado autoritativo (`GameState`) NO se re-exportan aquí a
 * propósito: contienen la carta de cada rival, la carta robada y el mazo, y alcanzarlos
 * desde esta superficie debe ser un error de compilación (ADR 0005). Este archivo es un
 * barril; no debe contener lógica.
 */

export { CARD } from './cards.ts';
export type { CardName, CardValue } from './cards.ts';
export type { Result } from './result.ts';
export type { RuleViolation } from './violation.ts';
export type { PlayerId, Player, Hand } from './state.ts';
export type { PlayerView } from './view.ts';
export type { Command } from './command.ts';
