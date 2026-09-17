/**
 * Intención de un jugador y su resolución: robar, o descartar una de sus dos cartas — sin
 * resolver ningún efecto de carta todavía (issue #12).
 *
 * `applyCommand` valida en orden "quién → cuándo → qué": primero que sea el jugador del
 * turno, luego que la fase admita el comando, y solo entonces lo específico de cada uno
 * (mazo con cartas para robar; la carta pedida, en mano, para descartar).
 */

import type { CardName } from './cards.ts';
import type { GameEvent } from './event.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import type { ActivePlayer, GameState, PlayerId, Round } from './state.ts';
import type { RuleViolation } from './violation.ts';

export type Command =
  | { readonly type: 'Draw'; readonly playerId: PlayerId }
  | { readonly type: 'Discard'; readonly playerId: PlayerId; readonly card: CardName };

type Applied = { readonly state: GameState; readonly events: readonly GameEvent[] };

/**
 * El jugador del turno, activo. Que lo sea es una invariante que este módulo mantiene por
 * construcción (`nextActivePlayer` nunca elige a un eliminado): si se rompiera, sería un bug
 * de orquestación, no una jugada ilegal de un cliente (ADR 0007).
 */
function activeTurnPlayer(round: Round, playerId: PlayerId): ActivePlayer {
  const player = round.players.find((candidate) => candidate.id === playerId);
  if (player === undefined || player.status !== 'active') {
    throw new Error(`El jugador del turno '${playerId}' no es un activo de la ronda.`);
  }
  return player;
}

/** Recorrido circular en orden de asiento desde `fromId`: el primer jugador activo. */
function nextActivePlayer(round: Round, fromId: PlayerId): PlayerId {
  const { players } = round;
  const startIndex = players.findIndex((player) => player.id === fromId);
  if (startIndex === -1) {
    throw new Error(`Jugador '${fromId}' no está en la ronda: no se puede avanzar el turno.`);
  }
  for (let step = 1; step <= players.length; step += 1) {
    const candidate = players[(startIndex + step) % players.length];
    if (candidate?.status === 'active') {
      return candidate.id;
    }
  }
  throw new Error(`Ningún jugador activo al que avanzar el turno desde '${fromId}'.`);
}

function applyDraw(state: GameState, player: PlayerId): Result<Applied, RuleViolation> {
  const { round } = state;
  if (round.turn.stage !== 'draw') {
    return err({ code: 'AlreadyDrew', player });
  }
  const drawn = round.deck[0];
  if (drawn === undefined) {
    return err({ code: 'DeckEmpty', player });
  }

  const newRound: Round = {
    ...round,
    deck: round.deck.slice(1),
    turn: { stage: 'play', player, drawn },
  };
  const event: GameEvent = { type: 'CardDrawn', player, card: drawn, audience: [player] };

  return ok({ state: { ...state, round: newRound, log: [...state.log, event] }, events: [event] });
}

function applyDiscard(
  state: GameState,
  player: PlayerId,
  card: CardName,
): Result<Applied, RuleViolation> {
  const { round } = state;
  const { turn } = round;
  if (turn.stage !== 'play') {
    return err({ code: 'MustDrawFirst', player });
  }

  const current = activeTurnPlayer(round, player);
  let remaining: CardName;
  if (card === current.held) {
    remaining = turn.drawn;
  } else if (card === turn.drawn) {
    remaining = current.held;
  } else {
    return err({ code: 'CardNotInHand', player, card });
  }

  const discarded: ActivePlayer = {
    ...current,
    held: remaining,
    discards: [...current.discards, card],
  };
  const players = round.players.map((candidate) =>
    candidate.id === player ? discarded : candidate,
  );
  const next = nextActivePlayer(round, player);
  const newRound: Round = { ...round, players, turn: { stage: 'draw', player: next } };

  const cardDiscarded: GameEvent = { type: 'CardDiscarded', player, card, audience: 'public' };
  const turnChanged: GameEvent = { type: 'TurnChanged', player: next, audience: 'public' };

  return ok({
    state: { ...state, round: newRound, log: [...state.log, cardDiscarded, turnChanged] },
    events: [cardDiscarded, turnChanged],
  });
}

/**
 * Aplica la intención de un jugador al estado autoritativo. Estado inmutable: nunca se muta
 * en sitio, cada llamada produce un `GameState` nuevo (ADR 0004). Corre en el servidor desde
 * la Fase 4; en las Fases 1–3, en memoria.
 */
export function applyCommand(state: GameState, cmd: Command): Result<Applied, RuleViolation> {
  const { turn } = state.round;
  if (cmd.playerId !== turn.player) {
    return err({ code: 'NotYourTurn', player: cmd.playerId, current: turn.player });
  }
  if (cmd.type === 'Draw') {
    return applyDraw(state, cmd.playerId);
  }
  return applyDiscard(state, cmd.playerId, cmd.card);
}
