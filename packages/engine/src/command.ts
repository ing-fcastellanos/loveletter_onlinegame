/** PROVISIONAL — intención de un jugador. El issue #12 la desarrolla a los comandos reales. */

import type { PlayerId } from './state.ts';

export type Command = {
  readonly type: 'Draw';
  readonly playerId: PlayerId;
};
