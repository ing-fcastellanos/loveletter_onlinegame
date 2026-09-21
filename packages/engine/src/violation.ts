/**
 * Violación de una regla del juego: un código y los datos del caso.
 *
 * No lleva texto a propósito. El motor está en inglés y la interfaz en español, y la
 * traducción vive solo en la capa de presentación; un mensaje aquí invitaría a mostrarlo
 * tal cual. Al ser una unión, el compilador obliga a que la presentación cubra cada
 * código que se añada.
 *
 * Los cinco primeros son del ciclo de turno (issue #12). Los tres siguientes son del
 * objetivo y la adivinanza del Guardia y el Sacerdote (issue #14). Cada regla de la Fase 2
 * añade su variante.
 */

import type { CardName } from './cards.ts';
import type { PlayerId } from './state.ts';

export type RuleViolation =
  | { readonly code: 'NotYourTurn'; readonly player: PlayerId; readonly current: PlayerId }
  | { readonly code: 'CardNotInHand'; readonly player: PlayerId; readonly card: CardName }
  | { readonly code: 'AlreadyDrew'; readonly player: PlayerId }
  | { readonly code: 'MustDrawFirst'; readonly player: PlayerId }
  | { readonly code: 'DeckEmpty'; readonly player: PlayerId }
  | { readonly code: 'MissingTarget'; readonly player: PlayerId }
  | { readonly code: 'IllegalTarget'; readonly player: PlayerId; readonly target: PlayerId }
  | { readonly code: 'InvalidGuess'; readonly player: PlayerId };
