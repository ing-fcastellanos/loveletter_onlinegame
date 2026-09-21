/**
 * Efectos de carta (capability `card-effects`, issue #14: Guardia y Sacerdote).
 *
 * La primera eliminación de todo el motor y la primera vez que un evento con audiencia
 * restringida tiene un productor real. Los estados de prueba se arman a mano para controlar
 * exactamente quién está protegido, qué carta sostiene cada quien, y con cuántos jugadores
 * se juega — igual que en `command.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand, project } from '@loveletter/engine/server';
import type {
  ActivePlayer,
  CardName,
  Command,
  GameState,
  Player,
  PlayerId,
  Round,
  RuleViolation,
} from '@loveletter/engine/server';

import { testSeed } from './support/seed.ts';

function player(id: PlayerId, name: string, tokens = 0): Player {
  return { id, name, tokens };
}

function active(
  id: PlayerId,
  held: CardName,
  opts: { discards?: readonly CardName[]; protected?: boolean } = {},
): ActivePlayer {
  return {
    status: 'active',
    id,
    held,
    discards: opts.discards ?? [],
    protected: opts.protected ?? false,
  };
}

function game(players: readonly Player[], round: Round): GameState {
  return { seed: testSeed(1), players, round, log: [] };
}

/** En pruebas, un comando válido rechazado es un fallo de la prueba, no una regla del juego. */
function applied(state: GameState, cmd: Command) {
  const result = applyCommand(state, cmd);
  if (!result.ok) {
    throw new Error(`applyCommand rechazó un comando válido: ${result.error.code}`);
  }
  return result.value;
}

function rejected(state: GameState, cmd: Command): RuleViolation {
  const result = applyCommand(state, cmd);
  if (result.ok) {
    throw new Error('applyCommand aceptó un comando que debía rechazarse');
  }
  return result.error;
}

const ANA = player('ana', 'Ana');
const BETO = player('beto', 'Beto');
const CARO = player('caro', 'Caro');

function playingGuard(players: readonly ActivePlayer[]): Round {
  return {
    number: 1,
    deck: [],
    setAside: 'Princess',
    faceUp: [],
    players,
    turn: { stage: 'play', player: 'ana', drawn: 'Guard' },
  };
}

function playingPriest(players: readonly ActivePlayer[]): Round {
  return {
    number: 1,
    deck: [],
    setAside: 'Princess',
    faceUp: [],
    players,
    turn: { stage: 'play', player: 'ana', drawn: 'Priest' },
  };
}

describe('Guardia y Sacerdote exigen un objetivo activo, no protegido y distinto de quien juega', () => {
  it('un objetivo protegido es ilegal si hay otro disponible', () => {
    const round = playingGuard([
      active('ana', 'Priest'),
      active('beto', 'Baron', { protected: true }),
      active('caro', 'King'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    expect(
      rejected(state, {
        type: 'Discard',
        playerId: 'ana',
        card: 'Guard',
        target: 'beto',
        guess: 'King',
      }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'beto' });
  });

  it('apuntarse a uno mismo es ilegal si hay otro objetivo disponible', () => {
    const round = playingGuard([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'Guard', target: 'ana' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'ana' });
  });

  it('omitir el objetivo es ilegal si existe uno legal', () => {
    const round = playingPriest([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    expect(rejected(state, { type: 'Discard', playerId: 'ana', card: 'Priest' })).toEqual({
      code: 'MissingTarget',
      player: 'ana',
    });
  });
});

describe('Guardia y Sacerdote se descartan sin efecto si no hay ningún objetivo legal', () => {
  it('sin objetivo legal, el descarte no cambia nada más', () => {
    const round = playingGuard([
      active('ana', 'Priest'),
      active('beto', 'Baron', { protected: true }),
    ]);
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Guard',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'Guard', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron', { protected: true }),
    );
  });
});

describe('adivinar "Guardia" es una jugada ilegal', () => {
  it('adivinar "Guardia" se rechaza', () => {
    const round = playingGuard([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, {
        type: 'Discard',
        playerId: 'ana',
        card: 'Guard',
        target: 'beto',
        guess: 'Guard',
      }),
    ).toEqual({ code: 'InvalidGuess', player: 'ana' });
  });

  it('omitir la carta adivinada se rechaza', () => {
    const round = playingGuard([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'Guard', target: 'beto' }),
    ).toEqual({ code: 'InvalidGuess', player: 'ana' });
  });
});

describe('el Guardia elimina al objetivo si acierta su carta', () => {
  it('acertar elimina al objetivo', () => {
    const round = playingGuard([
      active('ana', 'Priest'),
      active('beto', 'Baron', { discards: ['King'] }),
    ]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Guard',
      target: 'beto',
      guess: 'Baron',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual({
      status: 'eliminated',
      id: 'beto',
      discards: ['King', 'Baron'],
    });
  });
});

describe('el Guardia no tiene efecto si falla', () => {
  it('fallar no cambia nada más', () => {
    const round = playingGuard([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Guard',
      target: 'beto',
      guess: 'King',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron'),
    );
  });
});

describe('el acierto o fallo del Guardia es público, sin revelar la carta si falla', () => {
  it('el evento del Guardia es visible para cualquier jugador', () => {
    const round = playingGuard([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    const { events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Guard',
      target: 'beto',
      guess: 'King',
    });

    expect(events).toContainEqual({
      type: 'GuardGuessed',
      player: 'ana',
      target: 'beto',
      guess: 'King',
      hit: false,
      audience: 'public',
    });
  });

  it('un fallo no revela la carta real del objetivo', () => {
    const round = playingGuard([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Guard',
      target: 'beto',
      guess: 'King',
    });

    const view = project(next, 'ana');
    expect(JSON.stringify(view)).not.toContain('Baron');
  });
});

describe('el Sacerdote revela la mano del objetivo solo a quien lo jugó', () => {
  it('quien juega el Sacerdote ve la carta del objetivo', () => {
    const round = playingPriest([active('ana', 'Guard'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Priest',
      target: 'beto',
    });

    expect(project(next, 'ana').log).toContainEqual({
      type: 'PriestPeeked',
      player: 'ana',
      target: 'beto',
      card: 'Baron',
      audience: ['ana'],
    });
  });

  it('nadie más ve esa carta, ni siquiera el objetivo', () => {
    const round = playingPriest([
      active('ana', 'Guard'),
      active('beto', 'Baron'),
      active('caro', 'King'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Priest',
      target: 'beto',
    });

    const betoLog = project(next, 'beto').log;
    const caroLog = project(next, 'caro').log;

    expect(betoLog.some((event) => event.type === 'PriestPeeked')).toBe(false);
    expect(caroLog.some((event) => event.type === 'PriestPeeked')).toBe(false);
    expect(JSON.stringify(betoLog)).not.toContain('PriestPeeked');
    expect(JSON.stringify(caroLog)).not.toContain('PriestPeeked');
  });
});
