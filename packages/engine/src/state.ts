/**
 * El estado de una partida (ADR 0007).
 *
 * Dos capas con ciclos de vida distintos: lo que dura toda la partida (identidad y fichas
 * de afecto) y lo que dura una ronda (carta, descartes, eliminación, protección, mazo y
 * turno). Iniciar una ronda es construir un `Round` nuevo: no hay nada que resetear, y las
 * fichas no se pueden tocar por accidente porque no viven ahí.
 *
 * El criterio de todo el módulo: un estado que el juego no admite no se puede construir.
 * Lo que el tipo no puede expresar (integridad de identificadores, conservación de las 16
 * cartas) está enumerado en el ADR 0007 junto con quién lo custodia.
 */

import type { CardName } from './cards.ts';

export type PlayerId = string;

/** Nivel partida: persiste entre rondas. Información pública. */
export type Player = {
  readonly id: PlayerId;
  readonly name: string;
  readonly tokens: number;
};

/**
 * La mano tal como la ve su dueño: una carta, o dos durante su fase de jugar. Es una vista
 * DERIVADA; el estado nunca la almacena. La calcula `handOf`.
 */
export type Hand = readonly [CardName] | readonly [CardName, CardName];

/**
 * Jugador que sigue en la ronda. Sostiene exactamente una carta: la segunda carta de un
 * turno no pertenece al jugador sino al turno, así que nadie puede tener dos fuera de él.
 */
export type ActivePlayer = {
  readonly status: 'active';
  readonly id: PlayerId;
  readonly held: CardName;
  readonly discards: readonly CardName[];
  /** Protegido por la Sirvienta hasta el inicio de su siguiente turno. */
  readonly protected: boolean;
};

/**
 * Jugador fuera de la ronda. No tiene carta —el campo no existe—, pero conserva sus
 * descartes: siguen sobre la mesa, son información pública y alimentan la deducción.
 */
export type EliminatedPlayer = {
  readonly status: 'eliminated';
  readonly id: PlayerId;
  readonly discards: readonly CardName[];
};

export type RoundPlayer = ActivePlayer | EliminatedPlayer;

/**
 * El turno como máquina de estados: `draw` (aún no ha robado) → `play` (ya robó y debe
 * descartar). La carta robada existe solo en `play`: `stage` no duplica información, es
 * el único lugar donde vive esa carta.
 */
export type Turn =
  | { readonly stage: 'draw'; readonly player: PlayerId }
  | { readonly stage: 'play'; readonly player: PlayerId; readonly drawn: CardName };

/**
 * Una ronda. Cuando lleguen los estados terminales (issues #20 y #21) pasará a ser una
 * unión por estado —`playing` con turno, `over` con ganador— en vez de acumular campos
 * opcionales.
 */
export type Round = {
  /** Desde 1. */
  readonly number: number;
  /** Orden de robo: el tope es el índice 0. */
  readonly deck: readonly CardName[];
  readonly setAside: CardName;
  /** Tres en la partida a dos, ninguna en las demás (lo decide el setup, issue #9). */
  readonly faceUp: readonly [] | readonly [CardName, CardName, CardName];
  /** Orden de turno. Un eliminado cambia de variante, no desaparece del arreglo. */
  readonly players: readonly RoundPlayer[];
  readonly turn: Turn;
};

/** Estado autoritativo: lo sabe todo. Nunca sale del servidor (ADR 0004). */
export type GameState = {
  /** Provisional: el issue #8 decide si el PRNG necesita un estado más rico. */
  readonly seed: number;
  /** Orden de asiento. */
  readonly players: readonly Player[];
  readonly round: Round;
};

/**
 * La mano de un jugador según el turno: dos cartas para el jugador en turno en su fase de
 * jugar, una para cualquier otro activo, y `null` para un eliminado o un id desconocido.
 */
export function handOf(round: Round, playerId: PlayerId): Hand | null {
  const player = round.players.find((candidate) => candidate.id === playerId);
  if (player === undefined || player.status === 'eliminated') {
    return null;
  }
  const { turn } = round;
  if (turn.stage === 'play' && turn.player === playerId) {
    return [player.held, turn.drawn];
  }
  return [player.held];
}
