/**
 * PROVISIONAL — marcador del issue #10.
 *
 * Lo que un jugador puede ver. La información oculta no aparece censurada sino AUSENTE
 * del tipo. El modelo del ADR 0007 añade información que ningún jugador ve —la carta de
 * cada rival, la carta robada del turno y el orden del mazo, además de la carta apartada—
 * y ninguna llega aquí: la vista sigue exponiendo solo el conteo del mazo.
 */

import type { GameState, PlayerId } from './state.ts';

export type PlayerView = {
  readonly deckCount: number;
};

/**
 * Proyecta el estado autoritativo a lo que un jugador puede ver. Corre en memoria mientras
 * el juego es local, y en el servidor a partir de la Fase 4 (ADR 0004). `playerId` no se
 * usa todavía; la firma se fija porque es el contrato, y el issue #10 la completa.
 */
export function project(state: GameState, playerId: PlayerId): PlayerView {
  void playerId;
  return { deckCount: state.round.deck.length };
}
