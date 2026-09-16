/**
 * Proyección del estado autoritativo a lo que un jugador puede ver (ADR 0004).
 *
 * Cada asiento combina el `Player` de partida (identidad, fichas) con el `RoundPlayer` de
 * la ronda (carta, descartes, protección). Que los ids de una capa aparezcan en la otra, en
 * el mismo orden, es una invariante que construye `setup.ts` y que este módulo da por
 * cierta (ADR 0007): si llegara a romperse es un bug del motor, no una jugada ilegal ni una
 * entrada de anfitrión, así que se hace ruido en vez de fingir un asiento inventado.
 */

import type { CardName } from './cards.ts';
import type { GameEvent } from './event.ts';
import { handOf } from './state.ts';
import type { GameState, Hand, Player, PlayerId, Round, RoundPlayer } from './state.ts';

export type PlayerSeatView =
  | {
      readonly self: true;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'active';
      readonly hand: Hand;
      readonly discards: readonly CardName[];
      readonly protected: boolean;
    }
  | {
      readonly self: true;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'eliminated';
      readonly discards: readonly CardName[];
    }
  | {
      readonly self: false;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'active';
      /** Siempre `true` mientras esté activo (ADR 0007): nunca la carta en sí. */
      readonly hasCard: boolean;
      readonly discards: readonly CardName[];
      readonly protected: boolean;
    }
  | {
      readonly self: false;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'eliminated';
      readonly discards: readonly CardName[];
    };

export type PlayerView = {
  readonly roundNumber: number;
  readonly deckCount: number;
  readonly faceUp: Round['faceUp'];
  readonly players: readonly PlayerSeatView[];
  /** Nunca lleva la carta robada: si es mi turno, ya está en mi propio `hand`. */
  readonly turn: { readonly stage: 'draw' | 'play'; readonly player: PlayerId };
  /** Público, o restringido a este jugador — nunca un evento fuera de su audiencia. */
  readonly log: readonly GameEvent[];
};

function isVisible(event: GameEvent, viewerId: PlayerId): boolean {
  return event.audience === 'public' || event.audience.includes(viewerId);
}

function findPlayer(state: GameState, id: PlayerId): Player {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) {
    throw new Error(
      `Jugador '${id}' está en la ronda pero no en la partida: ids desalineados entre capas.`,
    );
  }
  return player;
}

function seatView(state: GameState, roundPlayer: RoundPlayer, viewerId: PlayerId): PlayerSeatView {
  const player = findPlayer(state, roundPlayer.id);
  const self = roundPlayer.id === viewerId;

  if (roundPlayer.status === 'eliminated') {
    return {
      self,
      id: player.id,
      name: player.name,
      tokens: player.tokens,
      status: 'eliminated',
      discards: roundPlayer.discards,
    };
  }

  if (self) {
    const hand = handOf(state.round, viewerId);
    if (hand === null) {
      throw new Error(`handOf devolvió null para '${viewerId}', que está activo en la ronda.`);
    }
    return {
      self: true,
      id: player.id,
      name: player.name,
      tokens: player.tokens,
      status: 'active',
      hand,
      discards: roundPlayer.discards,
      protected: roundPlayer.protected,
    };
  }

  return {
    self: false,
    id: player.id,
    name: player.name,
    tokens: player.tokens,
    status: 'active',
    hasCard: true,
    discards: roundPlayer.discards,
    protected: roundPlayer.protected,
  };
}

/**
 * Proyecta el estado autoritativo a lo que `playerId` puede ver. Corre en memoria mientras
 * el juego es local, y en el servidor a partir de la Fase 4 (ADR 0004). Asume que `playerId`
 * está sentado en la partida: es una precondición de quien llama, no una entrada que se
 * valide aquí.
 */
export function project(state: GameState, playerId: PlayerId): PlayerView {
  const { round } = state;
  return {
    roundNumber: round.number,
    deckCount: round.deck.length,
    faceUp: round.faceUp,
    players: round.players.map((roundPlayer) => seatView(state, roundPlayer, playerId)),
    turn: { stage: round.turn.stage, player: round.turn.player },
    log: state.log.filter((event) => isVisible(event, playerId)),
  };
}
