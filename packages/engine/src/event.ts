/**
 * Eventos con audiencia (ADR 0004): lo que ocurrió en la partida, y quién puede verlo.
 *
 * El conocimiento privado de un jugador se deriva de filtrar este registro por audiencia,
 * en vez de mantener una estructura aparte de "quién sabe qué". `type` como discriminante,
 * no `status` ni `stage`: un evento es un mensaje, no un estado — la misma convención que
 * ya fija `Command`.
 */

import type { CardName } from './cards.ts';
import type { PlayerId } from './state.ts';

/** Pública, o restringida a una lista explícita de jugadores. */
export type Audience = 'public' | readonly PlayerId[];

export type GameEvent =
  | {
      readonly type: 'RoundStarted';
      readonly round: number;
      readonly first: PlayerId;
      readonly audience: 'public';
    }
  | {
      readonly type: 'CardDrawn';
      readonly player: PlayerId;
      readonly card: CardName;
      readonly audience: readonly PlayerId[];
    }
  | {
      readonly type: 'CardDiscarded';
      readonly player: PlayerId;
      readonly card: CardName;
      readonly audience: 'public';
    }
  | { readonly type: 'TurnChanged'; readonly player: PlayerId; readonly audience: 'public' }
  | {
      readonly type: 'GuardGuessed';
      readonly player: PlayerId;
      readonly target: PlayerId;
      readonly guess: CardName;
      /** Si es `false`, ningún campo de este evento revela la carta real del objetivo. */
      readonly hit: boolean;
      readonly audience: 'public';
    }
  | {
      readonly type: 'PriestPeeked';
      readonly player: PlayerId;
      readonly target: PlayerId;
      readonly card: CardName;
      /** Solo quien jugó el Sacerdote — ni siquiera el propio objetivo. */
      readonly audience: readonly PlayerId[];
    }
  | { readonly type: 'PlayerEliminated'; readonly player: PlayerId; readonly audience: 'public' };
