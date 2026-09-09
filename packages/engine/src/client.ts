/**
 * Superficie de cliente — el punto de entrada por defecto de `@loveletter/engine`.
 *
 * Publica únicamente lo que un jugador puede conocer. `GameState` NO se re-exporta
 * aquí a propósito: alcanzarlo desde esta superficie debe ser un error de compilación
 * (ADR 0005). Este archivo es un barril; no debe contener lógica.
 */

export { CARD } from './cards.ts';
export type { CardName, CardValue } from './cards.ts';
export type { PlayerId, PlayerView, Command } from './state.ts';
