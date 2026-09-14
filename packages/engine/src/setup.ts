/**
 * Preparación de una partida y de sus rondas (ADR 0009).
 *
 * `startMatch` construye una partida a partir de la entrada del anfitrión y reparte la ronda 1;
 * `dealRound` reparte cualquier ronda con quien empieza dado, y el issue #20 la usa para
 * encadenar rondas. Una ronda solo nace aquí: por eso el número de jugadores, la unicidad de
 * los identificadores y la correlación con las descubiertas se validan en este módulo y no se
 * codifican en el tipo (ADR 0007).
 *
 * Orden canónico del reparto, congelado por la prueba dorada: la primera carta del mazo de la
 * ronda se aparta; en la partida a dos, las tres siguientes se descubren; después, una carta
 * por asiento en orden de asiento; el resto es el mazo. Nada de eso depende de quién empieza.
 */

import type { CardName } from './cards.ts';
import { shuffleRound, uniformInt } from './random.ts';
import type { Seed } from './random.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import type { ActivePlayer, GameState, Player, PlayerId, Round } from './state.ts';

/** Lo que el anfitrión sabe de cada jugador. Las fichas no se aceptan: nacen en cero. */
export type Seat = { readonly id: PlayerId; readonly name: string };

/** Una entrada de preparación rechazada. No es una jugada ilegal: la comete el anfitrión. */
export type SetupViolation =
  | { readonly code: 'InvalidPlayerCount'; readonly count: number }
  | { readonly code: 'DuplicatePlayerId'; readonly player: PlayerId }
  | { readonly code: 'UnknownFirstPlayer'; readonly player: PlayerId }
  | { readonly code: 'InvalidRoundNumber'; readonly number: number };

/** De dos a cuatro elementos, con la longitud en el tipo. */
type Seating<T> = readonly [T, T] | readonly [T, T, T] | readonly [T, T, T, T];

/** Guarda: comprueba la longitud en runtime; no es una aserción. */
function isSeating<T>(items: readonly T[]): items is Seating<T> {
  return items.length >= 2 && items.length <= 4;
}

/** Número de jugadores y, después, el primer identificador repetido en orden de asiento. */
function validateSeating<T extends { readonly id: PlayerId }>(
  items: readonly T[],
): Result<Seating<T>, SetupViolation> {
  if (!isSeating(items)) {
    return err({ code: 'InvalidPlayerCount', count: items.length });
  }
  const seen = new Set<PlayerId>();
  for (const item of items) {
    if (seen.has(item.id)) {
      return err({ code: 'DuplicatePlayerId', player: item.id });
    }
    seen.add(item.id);
  }
  return ok(items);
}

/**
 * Entero entre 1 y 2^32 − 1. Fuera de ese rango, `roundRandom` reduciría el número con
 * `>>> 0` y repartiría en silencio el mazo de otra ronda (1,5 → 1; 2^32 + 1 → 1).
 */
function isRoundNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 0xffff_ffff;
}

/** El elemento de la posición `index`, sin indexar: `reduce` sembrado con el primero. */
function pick<T>(items: readonly [T, ...T[]], index: number): T {
  return items.reduce((chosen, item, position) => (position === index ? item : chosen), items[0]);
}

function active(seat: { readonly id: PlayerId }, held: CardName): ActivePlayer {
  return { status: 'active', id: seat.id, held, discards: [], protected: false };
}

/**
 * Reparte la ronda `number` con `first` como quien empieza. Valida, en este orden, el número de
 * jugadores, los identificadores, el número de ronda y que quien empieza esté sentado.
 */
export function dealRound(
  seed: Seed,
  number: number,
  players: readonly Player[],
  first: PlayerId,
): Result<Round, SetupViolation> {
  const validated = validateSeating(players);
  if (!validated.ok) {
    return validated;
  }
  if (!isRoundNumber(number)) {
    return err({ code: 'InvalidRoundNumber', number });
  }
  const seating = validated.value;
  if (!seating.some((player) => player.id === first)) {
    return err({ code: 'UnknownFirstPlayer', player: first });
  }

  const [c0, c1, c2, c3, c4, c5, c6, c7, ...rest] = shuffleRound(seed, number).deck;
  const turn: Round['turn'] = { stage: 'draw', player: first };

  if (seating.length === 2) {
    const [a, b] = seating;
    const round: Round = {
      number,
      setAside: c0,
      faceUp: [c1, c2, c3],
      players: [active(a, c4), active(b, c5)],
      deck: [c6, c7, ...rest],
      turn,
    };
    return ok(round);
  }
  if (seating.length === 3) {
    const [a, b, c] = seating;
    const round: Round = {
      number,
      setAside: c0,
      faceUp: [],
      players: [active(a, c1), active(b, c2), active(c, c3)],
      deck: [c4, c5, c6, c7, ...rest],
      turn,
    };
    return ok(round);
  }
  const [a, b, c, d] = seating;
  const round: Round = {
    number,
    setAside: c0,
    faceUp: [],
    players: [active(a, c1), active(b, c2), active(c, c3), active(d, c4)],
    deck: [c5, c6, c7, ...rest],
    turn,
  };
  return ok(round);
}

/**
 * Construye una partida: jugadores con cero fichas, sorteo de quién empieza con el generador de
 * la ronda 1 —ya consumido por el barajado, así que el sorteo no altera el mazo— y reparto de
 * la ronda 1.
 */
export function startMatch(seed: Seed, seats: readonly Seat[]): Result<GameState, SetupViolation> {
  const validated = validateSeating(seats);
  if (!validated.ok) {
    return validated;
  }
  const seating = validated.value;
  const players: readonly Player[] = seating.map((seat) => ({
    id: seat.id,
    name: seat.name,
    tokens: 0,
  }));
  const first = pick(seating, uniformInt(shuffleRound(seed, 1).random, seating.length)).id;

  const round = dealRound(seed, 1, players, first);
  if (!round.ok) {
    return round;
  }
  return ok({ seed, players, round: round.value });
}
