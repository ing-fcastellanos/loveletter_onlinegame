/**
 * Preparación de una partida y de sus rondas (capability `round-setup`, ADR 0009).
 *
 * Las pruebas estadísticas usan semillas fijas: los conteos y el χ² salen iguales en cada
 * ejecución, así que nunca son intermitentes.
 */

import { describe, expect, it } from 'vitest';

import { DECK, dealRound, shuffleRound, startMatch } from '@loveletter/engine/server';
import type {
  CardName,
  GameState,
  Player,
  Round,
  RoundPlayer,
  Seat,
} from '@loveletter/engine/server';

import { testSeed } from './support/seed.ts';

const SEATS: readonly Seat[] = [
  { id: 'ana', name: 'Ana' },
  { id: 'beto', name: 'Beto' },
  { id: 'caro', name: 'Caro' },
  { id: 'dani', name: 'Dani' },
];

const REFERENCE_SEED = 20260911;
const SEED = 7;

/** Valor crítico de χ² al 0,1 %, por número de jugadores (n − 1 grados de libertad). */
const CHI2_CRITICAL: Readonly<Record<number, number>> = { 2: 10.828, 3: 13.816, 4: 16.266 };

function seatsFor(count: number): readonly Seat[] {
  return SEATS.slice(0, count);
}

function playersOf(seats: readonly Seat[]): readonly Player[] {
  return seats.map((seat) => ({ id: seat.id, name: seat.name, tokens: 0 }));
}

/** En pruebas, una entrada válida rechazada es un fallo de la prueba, no una regla del juego. */
function started(seedValue: number, seats: readonly Seat[]): GameState {
  const result = startMatch(testSeed(seedValue), seats);
  if (!result.ok) {
    throw new Error(`startMatch rechazó una entrada válida: ${result.error.code}`);
  }
  return result.value;
}

function dealt(
  seedValue: number,
  number: number,
  players: readonly Player[],
  first: string,
): Round {
  const result = dealRound(testSeed(seedValue), number, players, first);
  if (!result.ok) {
    throw new Error(`dealRound rechazó una entrada válida: ${result.error.code}`);
  }
  return result.value;
}

function heldOf(player: RoundPlayer): CardName | null {
  return player.status === 'active' ? player.held : null;
}

/**
 * Carta de cada jugador por identificador. Comprobar por posición no detectaría una ronda cuyos
 * jugadores quedaron desalineados con los asientos (lo demostró la mutación 5.5).
 */
function heldById(round: Round): Record<string, CardName | null> {
  return Object.fromEntries(round.players.map((player) => [player.id, heldOf(player)]));
}

function everyCard(round: Round): readonly CardName[] {
  return [
    round.setAside,
    ...round.faceUp,
    ...round.players.flatMap((player) => (player.status === 'active' ? [player.held] : [])),
    ...round.deck,
  ];
}

/** Posición de la primera carta repartida a los jugadores: tras la apartada y las descubiertas. */
function handsOffset(count: number): number {
  return count === 2 ? 4 : 1;
}

describe('una partida admite de dos a cuatro jugadores', () => {
  it('dos, tres o cuatro jugadores inician una partida', () => {
    for (const count of [2, 3, 4]) {
      expect(startMatch(testSeed(SEED), seatsFor(count)).ok, String(count)).toBe(true);
    }
  });

  it('una cantidad fuera de rango se rechaza como resultado, sin lanzar', () => {
    const five: readonly Seat[] = [...SEATS, { id: 'eli', name: 'Eli' }];
    for (const seats of [[], seatsFor(1), five]) {
      expect(() => startMatch(testSeed(SEED), seats)).not.toThrow();
      expect(startMatch(testSeed(SEED), seats)).toEqual({
        ok: false,
        error: { code: 'InvalidPlayerCount', count: seats.length },
      });
    }
  });
});

describe('los identificadores de jugador son únicos', () => {
  it('un identificador repetido se rechaza identificando el primero repetido en orden de asiento', () => {
    const seats: readonly Seat[] = [
      { id: 'ana', name: 'Ana' },
      { id: 'beto', name: 'Beto' },
      { id: 'beto', name: 'Otro Beto' },
      { id: 'ana', name: 'Otra Ana' },
    ];

    expect(() => startMatch(testSeed(SEED), seats)).not.toThrow();
    expect(startMatch(testSeed(SEED), seats)).toEqual({
      ok: false,
      error: { code: 'DuplicatePlayerId', player: 'beto' },
    });
  });
});

describe('una partida nueva empieza desde cero', () => {
  it('fichas en cero y primera ronda', () => {
    for (const count of [2, 3, 4]) {
      const game = started(SEED, seatsFor(count));

      expect(game.players).toEqual(playersOf(seatsFor(count)));
      expect(game.round.number).toBe(1);
    }
  });

  it('los jugadores de la ronda coinciden con los de la partida', () => {
    for (const count of [2, 3, 4]) {
      const game = started(SEED, seatsFor(count));

      expect(game.round.players.map((player) => player.id)).toEqual(
        game.players.map((player) => player.id),
      );
      for (const player of game.round.players) {
        expect(player).toMatchObject({ status: 'active', discards: [], protected: false });
      }
    }
  });
});

describe('una carta se aparta siempre y tres se descubren solo en la partida a dos', () => {
  it('la carta apartada es la primera del mazo de la ronda', () => {
    const deck = shuffleRound(testSeed(SEED), 1).deck;
    for (const count of [2, 3, 4]) {
      expect(started(SEED, seatsFor(count)).round.setAside, String(count)).toBe(deck[0]);
    }
  });

  it('en la partida a dos se descubren la segunda, la tercera y la cuarta carta', () => {
    const deck = shuffleRound(testSeed(SEED), 1).deck;

    expect(started(SEED, seatsFor(2)).round.faceUp).toEqual(deck.slice(1, 4));
  });

  it('con tres o cuatro jugadores no se descubre ninguna carta', () => {
    for (const count of [3, 4]) {
      expect(started(SEED, seatsFor(count)).round.faceUp, String(count)).toEqual([]);
    }
  });
});

describe('cada asiento recibe una carta en orden de asiento', () => {
  it('las cartas se reparten en orden de asiento', () => {
    const deck = shuffleRound(testSeed(SEED), 1).deck;
    for (const count of [2, 3, 4]) {
      const offset = handsOffset(count);

      const expected = Object.fromEntries(
        seatsFor(count).map((seat, index) => [seat.id, deck[offset + index]]),
      );

      expect(heldById(started(SEED, seatsFor(count)).round), String(count)).toEqual(expected);
    }
  });

  it('quien empieza no cambia lo que recibe cada asiento', () => {
    for (const count of [2, 3, 4]) {
      const players = playersOf(seatsFor(count));
      const hands = players.map((first) => heldById(dealt(SEED, 1, players, first.id)));
      for (const hand of hands) {
        expect(hand, String(count)).toEqual(hands[0]);
      }
    }
  });
});

describe('el mazo restante conserva todas las demás cartas', () => {
  it('tamaño del mazo restante según el número de jugadores', () => {
    expect(started(SEED, seatsFor(2)).round.deck).toHaveLength(10);
    expect(started(SEED, seatsFor(3)).round.deck).toHaveLength(12);
    expect(started(SEED, seatsFor(4)).round.deck).toHaveLength(11);
  });

  it('ninguna carta se pierde ni se duplica en el reparto', () => {
    const sortedDeck = [...DECK].sort();
    for (const count of [2, 3, 4]) {
      for (let sample = 0; sample < 500; sample += 1) {
        expect([...everyCard(started(sample, seatsFor(count)).round)].sort()).toEqual(sortedDeck);
      }
    }
  });
});

describe('quién empieza la primera ronda se sortea tras el barajado', () => {
  it('la ronda empieza con el jugador sorteado, antes de robar', () => {
    for (const count of [2, 3, 4]) {
      const game = started(SEED, seatsFor(count));

      expect(game.round.turn.stage).toBe('draw');
      expect(game.players.map((player) => player.id)).toContain(game.round.turn.player);
    }
  });

  it('el sorteo no altera el mazo', () => {
    for (const count of [2, 3, 4]) {
      const game = started(SEED, seatsFor(count));
      const withoutDraw = dealt(SEED, 1, game.players, 'ana');

      expect({ ...game.round, turn: null }, String(count)).toEqual({ ...withoutDraw, turn: null });
    }
  });

  it('el sorteo es uniforme', () => {
    const samples = 4_000;
    for (const count of [2, 3, 4]) {
      const starts = new Map<string, number>();
      for (let sample = 0; sample < samples; sample += 1) {
        const first = started(sample, seatsFor(count)).round.turn.player;
        starts.set(first, (starts.get(first) ?? 0) + 1);
      }
      const expected = samples / count;
      const chiSquare = seatsFor(count).reduce(
        (sum, seat) => sum + ((starts.get(seat.id) ?? 0) - expected) ** 2 / expected,
        0,
      );

      expect(chiSquare, String(count)).toBeLessThan(CHI2_CRITICAL[count] ?? 0);
    }
  });
});

describe('una ronda se reparte con quien empieza dado', () => {
  const players = playersOf(seatsFor(3));

  it('la ronda empieza con quien se indica', () => {
    for (const first of players) {
      expect(dealt(SEED, 1, players, first.id).turn).toEqual({ stage: 'draw', player: first.id });
    }
  });

  it('el número de ronda determina el mazo', () => {
    const round = dealt(SEED, 5, players, 'caro');
    const deck = shuffleRound(testSeed(SEED), 5).deck;

    expect(round.number).toBe(5);
    expect(round.setAside).toBe(deck[0]);
    expect(heldById(round)).toEqual({ ana: deck[1], beto: deck[2], caro: deck[3] });
    expect(round.deck).toEqual(deck.slice(4));
  });

  it('quien empieza debe estar sentado', () => {
    expect(() => dealRound(testSeed(SEED), 1, players, 'zoe')).not.toThrow();
    expect(dealRound(testSeed(SEED), 1, players, 'zoe')).toEqual({
      ok: false,
      error: { code: 'UnknownFirstPlayer', player: 'zoe' },
    });
  });

  it('el número de ronda debe ser un entero positivo', () => {
    // 2^32 no está en la spec, pero `roundRandom` lo reduciría a 0 en silencio: también se rechaza.
    for (const number of [0, -1, 1.5, 2 ** 32]) {
      expect(() => dealRound(testSeed(SEED), number, players, 'ana')).not.toThrow();
      expect(dealRound(testSeed(SEED), number, players, 'ana'), String(number)).toEqual({
        ok: false,
        error: { code: 'InvalidRoundNumber', number },
      });
    }
  });

  it('un conjunto de jugadores inválido se rechaza, y la validación sigue un orden fijo', () => {
    expect(dealRound(testSeed(SEED), 1, playersOf(seatsFor(1)), 'ana')).toEqual({
      ok: false,
      error: { code: 'InvalidPlayerCount', count: 1 },
    });
    expect(
      dealRound(testSeed(SEED), 1, [...players, { id: 'ana', name: 'Otra Ana', tokens: 0 }], 'ana'),
    ).toEqual({ ok: false, error: { code: 'DuplicatePlayerId', player: 'ana' } });
    // Número de jugadores antes que número de ronda, y este antes que quien empieza.
    expect(dealRound(testSeed(SEED), 0, playersOf(seatsFor(1)), 'zoe')).toMatchObject({
      error: { code: 'InvalidPlayerCount' },
    });
    expect(dealRound(testSeed(SEED), 0, players, 'zoe')).toMatchObject({
      error: { code: 'InvalidRoundNumber' },
    });
  });
});

describe('el setup es determinista y está congelado', () => {
  it('misma semilla y mismos asientos, misma partida', () => {
    for (const count of [2, 3, 4]) {
      expect(started(REFERENCE_SEED, seatsFor(count))).toEqual(
        started(REFERENCE_SEED, seatsFor(count)),
      );
    }
  });

  it('la referencia produce el setup de referencia', () => {
    // Si esta prueba se pone roja, cambió el orden del reparto o el sorteo: las partidas
    // guardadas dejarían de reproducirse (ADR 0009).
    const round = started(REFERENCE_SEED, seatsFor(2)).round;

    expect({
      setAside: round.setAside,
      faceUp: round.faceUp,
      held: heldById(round),
      first: round.turn.player,
      deck: round.deck,
    }).toEqual({
      setAside: 'Guard',
      faceUp: ['Priest', 'Baron', 'Guard'],
      held: { ana: 'Princess', beto: 'Prince' },
      first: 'ana',
      deck: [
        'Handmaid',
        'Priest',
        'Prince',
        'Guard',
        'Guard',
        'King',
        'Countess',
        'Guard',
        'Handmaid',
        'Baron',
      ],
    });
  });
});
