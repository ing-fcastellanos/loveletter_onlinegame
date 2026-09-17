/**
 * Contrato de efecto y su tabla de despacho (issue #13).
 *
 * Un efecto recibe el estado, quién juega y los parámetros de su comando, y devuelve el
 * mismo resultado que `applyCommand`: un estado (el mismo, o uno nuevo) y sus eventos, o un
 * rechazo. La tabla exige una entrada por cada uno de los ocho personajes —mismo patrón que
 * `DECK_COMPOSITION` en `cards.ts`— así que agregar un personaje sin declarar su efecto no
 * compila.
 *
 * Las ocho apuntan hoy a `noEffect`: ningún efecto real se resuelve todavía. Los issues
 * #14 a #17 reemplazan, uno a uno, cada entrada por su implementación.
 */

import type { CardName } from './cards.ts';
import type { GameEvent } from './event.ts';
import { ok } from './result.ts';
import type { Result } from './result.ts';
import type { GameState, PlayerId } from './state.ts';
import type { RuleViolation } from './violation.ts';

/** Lo que el comando de descarte trae para el efecto de la carta jugada. */
export type EffectParams = { readonly target?: PlayerId; readonly guess?: CardName };

export type EffectResult = Result<
  { readonly state: GameState; readonly events: readonly GameEvent[] },
  RuleViolation
>;

export type EffectHandler = (
  state: GameState,
  player: PlayerId,
  params: EffectParams,
) => EffectResult;

/** El resultado explícito de un efecto sin comportamiento implementado: nada cambia. */
function noEffect(state: GameState, _player: PlayerId, _params: EffectParams): EffectResult {
  return ok({ state, events: [] });
}

export const EFFECTS = {
  Guard: noEffect,
  Priest: noEffect,
  Baron: noEffect,
  Handmaid: noEffect,
  Prince: noEffect,
  King: noEffect,
  Countess: noEffect,
  Princess: noEffect,
} as const satisfies Record<CardName, EffectHandler>;
