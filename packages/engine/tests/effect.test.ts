/**
 * Efectos de carta (capability `card-effects`): Guardia y Sacerdote (issue #14), Barón y
 * Sirvienta (issue #15), Príncipe y Rey (issue #16).
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

function playingBaron(players: readonly ActivePlayer[]): Round {
  return {
    number: 1,
    deck: [],
    setAside: 'Princess',
    faceUp: [],
    players,
    turn: { stage: 'play', player: 'ana', drawn: 'Baron' },
  };
}

function playingHandmaid(players: readonly ActivePlayer[]): Round {
  return {
    number: 1,
    deck: [],
    setAside: 'Princess',
    faceUp: [],
    players,
    turn: { stage: 'play', player: 'ana', drawn: 'Handmaid' },
  };
}

function playingKing(players: readonly ActivePlayer[]): Round {
  return {
    number: 1,
    deck: [],
    setAside: 'Princess',
    faceUp: [],
    players,
    turn: { stage: 'play', player: 'ana', drawn: 'King' },
  };
}

function playingPrince(
  players: readonly ActivePlayer[],
  opts: { deck?: readonly CardName[]; setAside?: CardName } = {},
): Round {
  return {
    number: 1,
    deck: opts.deck ?? ['Countess'],
    setAside: opts.setAside ?? 'Princess',
    faceUp: [],
    players,
    turn: { stage: 'play', player: 'ana', drawn: 'Prince' },
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
    // El turno pasa a beto: su propia protección expira al empezar SU turno (issue #15),
    // un efecto del avance de turno, no del fizzle del Guardia en sí.
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron', { protected: false }),
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

describe('el Barón exige un objetivo activo, no protegido y distinto de quien juega', () => {
  it('un objetivo protegido es ilegal si hay otro disponible', () => {
    const round = playingBaron([
      active('ana', 'Priest'),
      active('beto', 'King', { protected: true }),
      active('caro', 'Handmaid'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'Baron', target: 'beto' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'beto' });
  });

  it('apuntarse a uno mismo es ilegal si hay otro objetivo disponible', () => {
    const round = playingBaron([active('ana', 'Priest'), active('beto', 'King')]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'Baron', target: 'ana' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'ana' });
  });
});

describe('el Barón se descarta sin efecto si no hay ningún objetivo legal', () => {
  it('sin objetivo legal, el descarte no cambia nada más', () => {
    const round = playingBaron([
      active('ana', 'Priest'),
      active('beto', 'King', { protected: true }),
    ]);
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'Baron', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
    // El turno pasa a beto: su protección expira al empezar SU turno (issue #15), no por el
    // fizzle del Barón en sí.
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'King', { protected: false }),
    );
  });
});

describe('el Barón elimina al de menor valor; un empate no elimina a nadie', () => {
  it('quien juega con la carta más baja queda eliminado', () => {
    const round = playingBaron([
      active('ana', 'Guard', { discards: ['Priest'] }),
      active('beto', 'King'),
    ]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
      target: 'beto',
    });

    // El descarte del propio Barón ya quedó en `discards` antes de resolver el efecto
    // (issue #13): la eliminación agrega la carta que le quedaba encima de eso.
    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toEqual({
      status: 'eliminated',
      id: 'ana',
      discards: ['Priest', 'Baron', 'Guard'],
    });
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'King'),
    );
  });

  it('el objetivo con la carta más baja queda eliminado', () => {
    const round = playingBaron([active('ana', 'King'), active('beto', 'Guard')]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
      target: 'beto',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual({
      status: 'eliminated',
      id: 'beto',
      discards: ['Guard'],
    });
    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toEqual(
      active('ana', 'King', { discards: ['Baron'] }),
    );
  });

  it('un empate no elimina a nadie', () => {
    const round = playingBaron([active('ana', 'King'), active('beto', 'King')]);
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
      target: 'beto',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toEqual(
      active('ana', 'King', { discards: ['Baron'] }),
    );
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'King'),
    );
  });
});

describe('la comparación del Barón solo la conocen los dos implicados', () => {
  it('los dos implicados conocen ambas cartas', () => {
    const round = playingBaron([active('ana', 'King'), active('beto', 'Guard')]);
    const state = game([ANA, BETO], round);

    const { events, state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
      target: 'beto',
    });

    const compared = {
      type: 'BaronCompared',
      player: 'ana',
      target: 'beto',
      playerCard: 'King',
      targetCard: 'Guard',
      audience: ['ana', 'beto'],
    };
    expect(events).toContainEqual(compared);
    expect(project(next, 'ana').log).toContainEqual(compared);
    expect(project(next, 'beto').log).toContainEqual(compared);
  });

  it('un tercero no ve la comparación', () => {
    const round = playingBaron([
      active('ana', 'King'),
      active('beto', 'Guard'),
      active('caro', 'Priest'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
      target: 'beto',
    });

    const caroLog = project(next, 'caro').log;
    expect(caroLog.some((event) => event.type === 'BaronCompared')).toBe(false);
    expect(JSON.stringify(caroLog)).not.toContain('BaronCompared');
  });

  it('un empate es indistinguible de un Barón sin objetivo legal para un tercero', () => {
    const round = playingBaron([
      active('ana', 'King'),
      active('beto', 'King'),
      active('caro', 'Priest'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Baron',
      target: 'beto',
    });

    // Mismo par de eventos que vería un tercero ante un Barón sin ningún objetivo legal.
    expect(project(next, 'caro').log).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'Baron', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
  });
});

describe('la Sirvienta protege a quien la juega de inmediato', () => {
  it('el propio estado y la vista de un rival lo muestran protegido', () => {
    const round = playingHandmaid([active('ana', 'King'), active('beto', 'Guard')]);
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Handmaid',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'Handmaid', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toMatchObject({
      protected: true,
    });
    expect(project(next, 'beto').players.find((seat) => seat.id === 'ana')).toMatchObject({
      protected: true,
    });
  });
});

describe('el Rey exige un objetivo activo, no protegido y distinto de quien juega', () => {
  it('un objetivo protegido es ilegal si hay otro disponible', () => {
    const round = playingKing([
      active('ana', 'Priest'),
      active('beto', 'Baron', { protected: true }),
      active('caro', 'Guard'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'King', target: 'beto' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'beto' });
  });

  it('apuntarse a uno mismo es ilegal si hay otro objetivo disponible', () => {
    const round = playingKing([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'King', target: 'ana' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'ana' });
  });
});

describe('el Rey se descarta sin efecto si no hay ningún objetivo legal', () => {
  it('sin objetivo legal, el descarte no cambia nada más', () => {
    const round = playingKing([
      active('ana', 'Priest'),
      active('beto', 'Baron', { protected: true }),
    ]);
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'King',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'King', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
    // El turno pasa a beto: su protección expira al empezar SU turno (issue #15), no por el
    // fizzle del Rey en sí.
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron', { protected: false }),
    );
  });
});

describe('el Rey intercambia la carta de quien juega con la del objetivo', () => {
  it('cada quien termina con la carta del otro', () => {
    const round = playingKing([active('ana', 'Priest'), active('beto', 'Baron')]);
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'King',
      target: 'beto',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'King', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
    // El descarte del propio Rey ya quedó en `discards` antes de resolver el efecto (issue
    // #13); el intercambio solo toca `held`.
    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toEqual(
      active('ana', 'Baron', { discards: ['King'] }),
    );
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Priest'),
    );
  });
});

describe('el intercambio del Rey no revela ninguna de las dos manos a un tercero', () => {
  it('cada implicado ve su nueva carta; nadie más ve ninguna de las dos', () => {
    const round = playingKing([
      active('ana', 'Priest'),
      active('beto', 'Baron'),
      active('caro', 'Guard'),
    ]);
    const state = game([ANA, BETO, CARO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'King',
      target: 'beto',
    });

    expect(project(next, 'ana').players.find((seat) => seat.id === 'ana')).toMatchObject({
      hand: ['Baron'],
    });
    expect(project(next, 'beto').players.find((seat) => seat.id === 'beto')).toMatchObject({
      hand: ['Priest'],
    });

    const caroView = project(next, 'caro');
    expect(JSON.stringify(caroView)).not.toContain('Priest');
    expect(JSON.stringify(caroView)).not.toContain('Baron');
  });
});

describe('el Príncipe siempre tiene un objetivo legal, porque uno mismo lo es siempre', () => {
  it('apuntarse a uno mismo siempre es legal, aunque haya otro objetivo disponible', () => {
    const round = playingPrince([active('ana', 'Guard'), active('beto', 'Priest')], {
      deck: ['Countess'],
    });
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Prince',
      target: 'ana',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toEqual(
      active('ana', 'Countess', { discards: ['Prince', 'Guard'] }),
    );
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Priest'),
    );
  });

  it('omitir el objetivo se rechaza', () => {
    const round = playingPrince([active('ana', 'Guard'), active('beto', 'Priest')]);
    const state = game([ANA, BETO], round);

    expect(rejected(state, { type: 'Discard', playerId: 'ana', card: 'Prince' })).toEqual({
      code: 'MissingTarget',
      player: 'ana',
    });
  });

  it('apuntar a un rival protegido es ilegal', () => {
    const round = playingPrince([
      active('ana', 'Guard'),
      active('beto', 'Priest', { protected: true }),
    ]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'Prince', target: 'beto' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'beto' });
  });
});

describe('cuando todos los rivales están protegidos, apuntarse a sí mismo con el Príncipe es la única jugada legal', () => {
  it('apuntar al único rival protegido se rechaza', () => {
    const round = playingPrince([
      active('ana', 'Guard'),
      active('beto', 'Priest', { protected: true }),
    ]);
    const state = game([ANA, BETO], round);

    expect(
      rejected(state, { type: 'Discard', playerId: 'ana', card: 'Prince', target: 'beto' }),
    ).toEqual({ code: 'IllegalTarget', player: 'ana', target: 'beto' });
  });

  it('apuntarse a uno mismo se acepta', () => {
    const round = playingPrince(
      [active('ana', 'Guard'), active('beto', 'Priest', { protected: true })],
      { deck: ['Countess'] },
    );
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Prince',
      target: 'ana',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toEqual(
      active('ana', 'Countess', { discards: ['Prince', 'Guard'] }),
    );
  });
});

describe('el objetivo del Príncipe descarta su carta y roba otra, sin disparar el efecto de la carta forzada', () => {
  it('el objetivo termina con una carta nueva', () => {
    const round = playingPrince([active('ana', 'Guard'), active('beto', 'Priest')], {
      deck: ['Countess'],
    });
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Prince',
      target: 'beto',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'Prince', audience: 'public' },
      { type: 'CardDiscarded', player: 'beto', card: 'Priest', audience: 'public' },
      { type: 'CardDrawn', player: 'beto', card: 'Countess', audience: ['beto'] },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Countess', { discards: ['Priest'] }),
    );
  });

  it('la carta forzada no dispara su propio efecto', () => {
    const round = playingPrince([active('ana', 'Priest'), active('beto', 'Guard')], {
      deck: ['Countess'],
    });
    const state = game([ANA, BETO], round);

    const { events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Prince',
      target: 'beto',
    });

    expect(events.some((event) => event.type === 'GuardGuessed')).toBe(false);
  });
});

describe('con el mazo vacío, el Príncipe entrega la carta apartada al inicio de la ronda', () => {
  it('el objetivo recibe la carta apartada', () => {
    const round = playingPrince([active('ana', 'Guard'), active('beto', 'Priest')], {
      deck: [],
      setAside: 'King',
    });
    const state = game([ANA, BETO], round);

    const { state: next } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Prince',
      target: 'beto',
    });

    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'King', { discards: ['Priest'] }),
    );
    expect(next.round.deck).toEqual([]);
  });
});

describe('si el Príncipe fuerza el descarte de la Princesa, el objetivo queda eliminado', () => {
  it('el objetivo queda eliminado sin robar ninguna carta', () => {
    const round = playingPrince([active('ana', 'Guard'), active('beto', 'Princess')], {
      deck: ['Countess'],
    });
    const state = game([ANA, BETO], round);

    const { state: next, events } = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'Prince',
      target: 'beto',
    });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'Prince', audience: 'public' },
      { type: 'CardDiscarded', player: 'beto', card: 'Princess', audience: 'public' },
      { type: 'PlayerEliminated', player: 'beto', audience: 'public' },
      { type: 'TurnChanged', player: 'ana', audience: 'public' },
    ]);
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual({
      status: 'eliminated',
      id: 'beto',
      discards: ['Princess'],
    });
    // No se le entregó la carta del mazo: la Princesa forzada elimina antes de robar.
    expect(next.round.deck).toEqual(['Countess']);
  });
});
