/**
 * Proyección PlayerView (capability `player-view`, ADR 0004).
 *
 * Los estados de prueba se arman a mano: el objetivo es controlar exactamente qué es
 * público y qué es oculto en cada caso, incluidos los que el reparto real no produce
 * (jugadores eliminados, protección, fase de jugar de un rival).
 */

import { describe, expect, it } from 'vitest';

import { handOf, project } from '@loveletter/engine/server';
import type {
  ActivePlayer,
  CardName,
  EliminatedPlayer,
  GameEvent,
  GameState,
  Player,
  PlayerId,
  PlayerSeatView,
  PlayerView,
  Round,
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

function eliminated(id: PlayerId, discards: readonly CardName[] = []): EliminatedPlayer {
  return { status: 'eliminated', id, discards };
}

function game(
  players: readonly Player[],
  round: Round,
  log: readonly GameEvent[] = [],
  seedValue = 1,
): GameState {
  return { seed: testSeed(seedValue), players, round, log };
}

function seatFor(view: PlayerView, id: PlayerId): PlayerSeatView {
  const seat = view.players.find((candidate) => candidate.id === id);
  if (seat === undefined) {
    throw new Error(`la vista no tiene asiento para '${id}'`);
  }
  return seat;
}

const ANA = player('ana', 'Ana');
const BETO = player('beto', 'Beto', 2);

describe('el jugador ve su propia mano completa', () => {
  it('una carta fuera de la fase de jugar', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: ['Guard'],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Priest'), active('beto', 'King')],
      turn: { stage: 'draw', player: 'ana' },
    });

    expect(seatFor(project(state, 'ana'), 'ana')).toEqual({
      self: true,
      id: 'ana',
      name: 'Ana',
      tokens: 0,
      status: 'active',
      hand: ['Priest'],
      discards: [],
      protected: false,
    });
  });

  it('dos cartas en la fase de jugar del propio turno', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Priest', { discards: ['Guard'] }), active('beto', 'King')],
      turn: { stage: 'play', player: 'ana', drawn: 'Countess' },
    });

    expect(seatFor(project(state, 'ana'), 'ana')).toEqual({
      self: true,
      id: 'ana',
      name: 'Ana',
      tokens: 0,
      status: 'active',
      hand: ['Priest', 'Countess'],
      discards: ['Guard'],
      protected: false,
    });
  });
});

describe('los rivales no revelan su carta', () => {
  it('un rival activo no revela su carta', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Priest'), active('beto', 'King', { discards: ['Guard', 'Guard'] })],
      turn: { stage: 'draw', player: 'ana' },
    });

    expect(seatFor(project(state, 'ana'), 'beto')).toEqual({
      self: false,
      id: 'beto',
      name: 'Beto',
      tokens: 2,
      status: 'active',
      hasCard: true,
      discards: ['Guard', 'Guard'],
      protected: false,
    });
  });

  it('la protección de un rival es visible', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Priest'), active('beto', 'King', { protected: true })],
      turn: { stage: 'draw', player: 'ana' },
    });

    expect(seatFor(project(state, 'ana'), 'beto')).toMatchObject({ protected: true });
  });
});

describe('un jugador eliminado solo expone sus descartes', () => {
  it('un rival eliminado', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Priest'), eliminated('beto', ['King', 'Princess'])],
      turn: { stage: 'draw', player: 'ana' },
    });

    expect(seatFor(project(state, 'ana'), 'beto')).toEqual({
      self: false,
      id: 'beto',
      name: 'Beto',
      tokens: 2,
      status: 'eliminated',
      discards: ['King', 'Princess'],
    });
  });

  it('el propio jugador eliminado', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [eliminated('ana', ['Guard']), active('beto', 'King')],
      turn: { stage: 'draw', player: 'beto' },
    });

    expect(seatFor(project(state, 'ana'), 'ana')).toEqual({
      self: true,
      id: 'ana',
      name: 'Ana',
      tokens: 0,
      status: 'eliminated',
      discards: ['Guard'],
    });
  });
});

describe('la vista oculta la carta apartada y el orden del mazo', () => {
  it('el mazo se expone solo como cantidad', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: ['Guard', 'Priest', 'Baron'],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'King'), active('beto', 'Handmaid')],
      turn: { stage: 'draw', player: 'ana' },
    });

    const view = project(state, 'ana');

    expect(view.deckCount).toBe(3);
    expect(view).not.toHaveProperty('setAside');
    expect(view).not.toHaveProperty('deck');
  });
});

describe('las cartas descubiertas son visibles en toda vista', () => {
  it('descubiertas iguales para ambos jugadores', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: ['King', 'Handmaid', 'Countess'],
      players: [active('ana', 'Guard'), active('beto', 'Priest')],
      turn: { stage: 'draw', player: 'ana' },
    });

    const expected: Round['faceUp'] = ['King', 'Handmaid', 'Countess'];
    expect(project(state, 'ana').faceUp).toEqual(expected);
    expect(project(state, 'beto').faceUp).toEqual(expected);
  });

  it('sin descubiertas a tres o cuatro jugadores', () => {
    const CARO = player('caro', 'Caro');
    const state = game([ANA, BETO, CARO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Guard'), active('beto', 'Priest'), active('caro', 'Baron')],
      turn: { stage: 'draw', player: 'ana' },
    });

    expect(project(state, 'ana').faceUp).toEqual([]);
  });
});

describe('el turno no revela la carta que se acaba de robar', () => {
  it('la carta robada de un rival no aparece', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Guard'), active('beto', 'King')],
      turn: { stage: 'play', player: 'beto', drawn: 'Countess' },
    });

    const view = project(state, 'ana');

    expect(view.turn).toEqual({ stage: 'play', player: 'beto' });
    expect(JSON.stringify(view)).not.toContain('Countess');
  });

  it('la propia carta robada aparece solo como parte de la propia mano', () => {
    const state = game([ANA, BETO], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [active('ana', 'Guard'), active('beto', 'King')],
      turn: { stage: 'play', player: 'ana', drawn: 'Countess' },
    });

    const view = project(state, 'ana');

    expect(view.turn).toEqual({ stage: 'play', player: 'ana' });
    expect(seatFor(view, 'ana')).toMatchObject({ hand: ['Guard', 'Countess'] });
  });
});

describe('el orden de los asientos es el de la partida', () => {
  it('orden estable sin importar quién pide la vista', () => {
    const CARO = player('caro', 'Caro');
    const DANI = player('dani', 'Dani');
    const state = game([ANA, BETO, CARO, DANI], {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [
        active('ana', 'Guard'),
        active('beto', 'Priest'),
        active('caro', 'Baron'),
        active('dani', 'King'),
      ],
      turn: { stage: 'draw', player: 'ana' },
    });

    const order = state.round.players.map((p) => p.id);
    for (const viewer of order) {
      expect(
        project(state, viewer).players.map((seat) => seat.id),
        viewer,
      ).toEqual(order);
    }
  });
});

const MINIMAL_ROUND: Round = {
  number: 1,
  deck: [],
  setAside: 'Princess',
  faceUp: [],
  players: [active('ana', 'Guard'), active('beto', 'Priest')],
  turn: { stage: 'draw', player: 'ana' },
};

describe('todo evento declara su audiencia', () => {
  it('un evento público es visible para cualquiera', () => {
    const publicEvent: GameEvent = { type: 'TurnChanged', player: 'beto', audience: 'public' };
    const state = game([ANA, BETO], MINIMAL_ROUND, [publicEvent]);

    expect(project(state, 'ana').log).toEqual([publicEvent]);
    expect(project(state, 'beto').log).toEqual([publicEvent]);
  });

  it('un evento restringido solo es visible para su lista de jugadores', () => {
    const CARO = player('caro', 'Caro');
    const round: Round = {
      ...MINIMAL_ROUND,
      players: [active('ana', 'Guard'), active('beto', 'Priest'), active('caro', 'Baron')],
    };
    const restricted: GameEvent = {
      type: 'CardDrawn',
      player: 'ana',
      card: 'Guard',
      audience: ['ana', 'beto'],
    };
    const state = game([ANA, BETO, CARO], round, [restricted]);

    expect(project(state, 'ana').log).toEqual([restricted]);
    expect(project(state, 'beto').log).toEqual([restricted]);
    expect(project(state, 'caro').log).toEqual([]);
  });
});

describe('robar una carta es un evento restringido a quien la robó', () => {
  it('el evento identifica la carta, y su audiencia es únicamente quien robó', () => {
    const drawn: GameEvent = {
      type: 'CardDrawn',
      player: 'ana',
      card: 'Priest',
      audience: ['ana'],
    };
    const state = game([ANA, BETO], MINIMAL_ROUND, [drawn]);

    expect(project(state, 'ana').log).toEqual([drawn]);
    expect(project(state, 'beto').log).toEqual([]);
  });
});

describe('descartar una carta y cambiar de turno son eventos públicos', () => {
  it('ambos son visibles para cualquier jugador', () => {
    const discarded: GameEvent = {
      type: 'CardDiscarded',
      player: 'ana',
      card: 'Guard',
      audience: 'public',
    };
    const turnChanged: GameEvent = { type: 'TurnChanged', player: 'beto', audience: 'public' };
    const state = game([ANA, BETO], MINIMAL_ROUND, [discarded, turnChanged]);

    expect(project(state, 'ana').log).toEqual([discarded, turnChanged]);
    expect(project(state, 'beto').log).toEqual([discarded, turnChanged]);
  });
});

describe('el inicio de una ronda es un evento público', () => {
  it('identifica el número de ronda y quién la empieza, visible para cualquiera', () => {
    const started: GameEvent = { type: 'RoundStarted', round: 1, first: 'ana', audience: 'public' };
    const state = game([ANA, BETO], MINIMAL_ROUND, [started]);

    expect(project(state, 'ana').log).toEqual([started]);
    expect(project(state, 'beto').log).toEqual([started]);
  });
});

describe('la vista incluye el registro de eventos que el jugador puede ver', () => {
  it('un evento restringido no aparece para quien queda fuera de su audiencia, ni siquiera como entrada anónima', () => {
    const CARO = player('caro', 'Caro');
    const round: Round = {
      ...MINIMAL_ROUND,
      players: [active('ana', 'Guard'), active('beto', 'Priest'), active('caro', 'Baron')],
    };
    const restricted: GameEvent = {
      type: 'CardDrawn',
      player: 'ana',
      card: 'Guard',
      audience: ['ana', 'beto'],
    };
    const state = game([ANA, BETO, CARO], round, [restricted]);

    const caroView = project(state, 'caro');

    expect(caroView.log).toEqual([]);
    expect(JSON.stringify(caroView)).not.toContain('CardDrawn');
  });
});

/**
 * Verificación exhaustiva: para cada campo capaz de llevar una carta (`faceUp`, los
 * `discards` de cada asiento, la propia `hand`), su valor coincide exactamente con la
 * fuente correspondiente del estado — y ningún campo prohibido (`setAside`, `deck`,
 * `held`, `drawn`) existe en absoluto en la vista serializada. No es una búsqueda de texto:
 * los nombres de carta se repiten entre zonas visibles y ocultas del mismo estado, así que
 * comprobar "el texto no aparece en ningún lado" daría falsos positivos.
 */
const FORBIDDEN_KEYS = ['setAside', 'deck', 'held', 'drawn'] as const;

function collectKeys(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, found);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      found.add(key);
      collectKeys(nested, found);
    }
  }
  return found;
}

function assertNoLeak(state: GameState, viewerId: PlayerId): void {
  const view = project(state, viewerId);

  const keys = collectKeys(view);
  for (const forbidden of FORBIDDEN_KEYS) {
    expect(keys.has(forbidden), `${viewerId}: campo prohibido '${forbidden}' presente`).toBe(false);
  }

  expect(view.faceUp, `${viewerId}: faceUp`).toEqual(state.round.faceUp);
  expect(view.deckCount, `${viewerId}: deckCount`).toBe(state.round.deck.length);
  for (const roundPlayer of state.round.players) {
    expect(seatFor(view, roundPlayer.id).discards, `${viewerId} ve a ${roundPlayer.id}`).toEqual(
      roundPlayer.discards,
    );
  }

  const selfHand = handOf(state.round, viewerId);
  const selfSeat = seatFor(view, viewerId);
  if (selfHand === null) {
    expect(selfSeat, viewerId).toMatchObject({ status: 'eliminated' });
  } else {
    expect(selfSeat, viewerId).toMatchObject({ self: true, hand: selfHand });
  }
}

describe('ninguna carta oculta escapa a ninguna vista', () => {
  it('verificación exhaustiva contra los valores ocultos reales', () => {
    const CARO = player('caro', 'Caro');
    const DANI = player('dani', 'Dani');

    const fixtures: readonly GameState[] = [
      // 2 jugadores, fase de robar, todos activos.
      game([ANA, BETO], {
        number: 1,
        deck: ['Guard', 'Priest', 'Baron'],
        setAside: 'Princess',
        faceUp: ['King', 'Handmaid', 'Countess'],
        players: [active('ana', 'Prince', { discards: ['Guard'] }), active('beto', 'Guard')],
        turn: { stage: 'draw', player: 'ana' },
      }),
      // 2 jugadores, fase de jugar, un rival robando.
      game([ANA, BETO], {
        number: 1,
        deck: ['Priest'],
        setAside: 'Guard',
        faceUp: ['King', 'Baron', 'Handmaid'],
        players: [active('ana', 'Prince'), active('beto', 'Guard', { protected: true })],
        turn: { stage: 'play', player: 'beto', drawn: 'Countess' },
      }),
      // 3 jugadores, un eliminado, fase de robar.
      game([ANA, BETO, CARO], {
        number: 2,
        deck: ['Guard', 'Guard'],
        setAside: 'King',
        faceUp: [],
        players: [
          active('ana', 'Priest', { protected: true }),
          active('beto', 'Baron'),
          eliminated('caro', ['Princess', 'Guard']),
        ],
        turn: { stage: 'draw', player: 'ana' },
      }),
      // 4 jugadores, un eliminado, fase de jugar.
      game([ANA, BETO, CARO, DANI], {
        number: 3,
        deck: ['Handmaid'],
        setAside: 'Guard',
        faceUp: [],
        players: [
          active('ana', 'Baron'),
          eliminated('beto', ['Guard', 'Guard']),
          active('caro', 'King', { protected: true }),
          active('dani', 'Priest'),
        ],
        turn: { stage: 'play', player: 'dani', drawn: 'Countess' },
      }),
    ];

    for (const state of fixtures) {
      for (const roundPlayer of state.round.players) {
        assertNoLeak(state, roundPlayer.id);
      }
    }
  });
});
