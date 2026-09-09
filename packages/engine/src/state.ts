/**
 * PROVISIONAL — Fase 0.
 *
 * Modelo mínimo, sin reglas. Existe para que la frontera del `exports` tenga algo
 * de cada lado que probar (ADR 0005). No modela la partida: el issue #7 (Modelado
 * de datos) lo reemplaza por el modelo real.
 */

import type { CardName } from './cards.ts';

export type PlayerId = string;

/**
 * Estado autoritativo: lo sabe todo — mazo, carta apartada y semilla del PRNG.
 * Nunca sale del servidor y nunca lo consume la presentación (ADR 0004).
 */
export type GameState = {
  readonly deck: readonly CardName[];
  readonly setAside: CardName;
  readonly seed: number;
};

/**
 * Lo que un jugador puede ver. La información oculta no aparece censurada sino
 * AUSENTE del tipo: el mazo es un conteo, y la carta apartada no existe aquí de
 * ninguna forma. Cuando el issue #10 la desarrolle, la regla se mantiene: nunca el
 * mazo (solo su conteo), nunca la carta apartada, y nunca la mano de otro jugador
 * salvo lo que ese jugador haya llegado a conocer por un efecto.
 */
export type PlayerView = {
  readonly deckCount: number;
};

/** Intención de un jugador. El issue #12 la desarrolla a los comandos reales. */
export type Command = {
  readonly type: 'Draw';
  readonly playerId: PlayerId;
};

/**
 * Proyecta el estado autoritativo a lo que un jugador puede ver. Corre en memoria
 * mientras el juego es local, y en el servidor a partir de la Fase 4 (ADR 0004).
 * `playerId` todavía no se usa porque el modelo no tiene jugadores; la firma se fija
 * aquí porque es el contrato, y el issue #10 la completa.
 */
export function project(state: GameState, playerId: PlayerId): PlayerView {
  void playerId;
  return { deckCount: state.deck.length };
}
