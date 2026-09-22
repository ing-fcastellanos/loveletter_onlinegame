/**
 * Ciclo de turno: robar, descartar, avanzar (capability `turn-cycle`, issue #12), resolviendo
 * el efecto de la carta entre el descarte y el avance de turno (capability `effect-dispatch`,
 * issue #13).
 *
 * El Guardia y el Sacerdote ya tienen efecto real (issue #14, ver `effect.test.ts`); el resto
 * sigue sin implementar — descartarlas es un descarte más, sin cambiar nada adicional. Los
 * estados de prueba se arman a mano para controlar exactamente la fase del turno y quién está
 * eliminado, igual que en #10/#11.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand, CARD, startMatch } from '@loveletter/engine/server';
import type {
  ActivePlayer,
  CardName,
  Command,
  EliminatedPlayer,
  GameState,
  Player,
  PlayerId,
  Round,
  RuleViolation,
  Seat,
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

function game(players: readonly Player[], round: Round, seedValue = 1): GameState {
  return { seed: testSeed(seedValue), players, round, log: [] };
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

const DRAW_ROUND: Round = {
  number: 1,
  deck: ['Guard', 'Priest'],
  setAside: 'Princess',
  faceUp: [],
  players: [active('ana', 'King'), active('beto', 'Baron')],
  turn: { stage: 'draw', player: 'ana' },
};

const PLAY_ROUND: Round = {
  ...DRAW_ROUND,
  turn: { stage: 'play', player: 'ana', drawn: 'Handmaid' },
};

describe('solo el jugador del turno puede actuar', () => {
  it('robar fuera de turno se rechaza', () => {
    const state = game([ANA, BETO], DRAW_ROUND);

    expect(rejected(state, { type: 'Draw', playerId: 'beto' })).toEqual({
      code: 'NotYourTurn',
      player: 'beto',
      current: 'ana',
    });
  });

  it('descartar fuera de turno se rechaza', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    expect(rejected(state, { type: 'Discard', playerId: 'beto', card: 'Baron' })).toEqual({
      code: 'NotYourTurn',
      player: 'beto',
      current: 'ana',
    });
  });
});

describe('robar exige estar en la fase de robar', () => {
  it('robar dos veces en el mismo turno se rechaza', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    expect(rejected(state, { type: 'Draw', playerId: 'ana' })).toEqual({
      code: 'AlreadyDrew',
      player: 'ana',
    });
  });
});

describe('descartar exige haber robado', () => {
  it('descartar antes de robar se rechaza', () => {
    const state = game([ANA, BETO], DRAW_ROUND);

    expect(rejected(state, { type: 'Discard', playerId: 'ana', card: 'King' })).toEqual({
      code: 'MustDrawFirst',
      player: 'ana',
    });
  });
});

describe('robar exige que el mazo no esté vacío', () => {
  it('robar con el mazo vacío se rechaza', () => {
    const state = game([ANA, BETO], { ...DRAW_ROUND, deck: [] });

    expect(rejected(state, { type: 'Draw', playerId: 'ana' })).toEqual({
      code: 'DeckEmpty',
      player: 'ana',
    });
  });
});

describe('descartar exige tener la carta en mano', () => {
  it('descartar una carta ajena a la mano se rechaza', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    expect(rejected(state, { type: 'Discard', playerId: 'ana', card: 'Priest' })).toEqual({
      code: 'CardNotInHand',
      player: 'ana',
      card: 'Priest',
    });
  });
});

describe('robar mueve la carta superior del mazo a la mano del jugador', () => {
  it('la carta robada es la superior del mazo', () => {
    const state = game([ANA, BETO], DRAW_ROUND);

    const { state: next } = applied(state, { type: 'Draw', playerId: 'ana' });

    expect(next.round.turn).toEqual({ stage: 'play', player: 'ana', drawn: 'Guard' });
  });

  it('el resto del mazo y las demás manos no cambian', () => {
    const state = game([ANA, BETO], DRAW_ROUND);

    const { state: next } = applied(state, { type: 'Draw', playerId: 'ana' });

    expect(next.round.deck).toEqual(['Priest']);
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron'),
    );
  });
});

describe('descartar dispensa la carta elegida y conserva la otra', () => {
  it('la carta descartada se suma a los descartes del jugador', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    const { state: next } = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });

    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toMatchObject({
      discards: ['King'],
    });
  });

  it('la carta no descartada queda como la única en mano', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    const { state: next } = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });

    expect(next.round.players.find((candidate) => candidate.id === 'ana')).toMatchObject({
      status: 'active',
      held: 'Handmaid',
    });
  });
});

describe('descartar avanza el turno al siguiente jugador activo', () => {
  const CARO = player('caro', 'Caro');

  it('el turno pasa al siguiente jugador activo en orden de asiento', () => {
    const round: Round = {
      ...PLAY_ROUND,
      players: [active('ana', 'King'), active('beto', 'Baron'), active('caro', 'Priest')],
    };
    const state = game([ANA, BETO, CARO], round);

    const { state: next } = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });

    expect(next.round.turn).toEqual({ stage: 'draw', player: 'beto' });
  });

  it('un jugador eliminado se salta al avanzar el turno', () => {
    const round: Round = {
      ...PLAY_ROUND,
      players: [active('ana', 'King'), eliminated('beto', ['Guard']), active('caro', 'Priest')],
    };
    const state = game([ANA, BETO, CARO], round);

    const { state: next } = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });

    expect(next.round.turn).toEqual({ stage: 'draw', player: 'caro' });
  });
});

describe('la protección de la Sirvienta expira al empezar el turno de quien la jugó (issue #15)', () => {
  const CARO = player('caro', 'Caro');

  it('sigue protegido durante el turno de un rival intermedio', () => {
    const round: Round = {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [
        active('ana', 'King'),
        active('beto', 'Baron', { protected: true }),
        active('caro', 'Priest'),
      ],
      turn: { stage: 'play', player: 'caro', drawn: 'Handmaid' },
    };
    const state = game([ANA, BETO, CARO], round);

    // El turno de caro avanza a ana: todavía no le toca a beto, así que sigue protegido.
    const { state: next } = applied(state, { type: 'Discard', playerId: 'caro', card: 'Handmaid' });

    expect(next.round.turn).toEqual({ stage: 'draw', player: 'ana' });
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron', { protected: true }),
    );
  });

  it('deja de estarlo exactamente cuando su propio turno vuelve a empezar', () => {
    const round: Round = {
      number: 1,
      deck: [],
      setAside: 'Princess',
      faceUp: [],
      players: [
        active('ana', 'King'),
        active('beto', 'Baron', { protected: true }),
        active('caro', 'Priest'),
      ],
      turn: { stage: 'play', player: 'ana', drawn: 'Handmaid' },
    };
    const state = game([ANA, BETO, CARO], round);

    // El turno de ana avanza a beto: ahora sí es el inicio de su propio turno.
    const { state: next } = applied(state, { type: 'Discard', playerId: 'ana', card: 'Handmaid' });

    expect(next.round.turn).toEqual({ stage: 'draw', player: 'beto' });
    expect(next.round.players.find((candidate) => candidate.id === 'beto')).toEqual(
      active('beto', 'Baron', { protected: false }),
    );
  });
});

describe('cada comando produce sus eventos con la audiencia correcta', () => {
  it('robar produce el evento restringido a quien robó', () => {
    const state = game([ANA, BETO], DRAW_ROUND);

    const { events } = applied(state, { type: 'Draw', playerId: 'ana' });

    expect(events).toEqual([
      { type: 'CardDrawn', player: 'ana', card: 'Guard', audience: ['ana'] },
    ]);
  });

  it('descartar produce sus dos eventos públicos', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    const { events } = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'King', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
  });
});

describe('el estado nunca se modifica en sitio', () => {
  it('el estado original queda intacto tras aplicar un comando', () => {
    const state = game([ANA, BETO], DRAW_ROUND);
    const before = structuredClone(state);

    applyCommand(state, { type: 'Draw', playerId: 'ana' });

    expect(state).toEqual(before);
  });
});

describe('una ronda se juega por turnos hasta vaciar el mazo', () => {
  it('se puede jugar una ronda completa sin ningún comando rechazado', () => {
    const seats: readonly Seat[] = [
      { id: 'ana', name: 'Ana' },
      { id: 'beto', name: 'Beto' },
    ];
    const started = startMatch(testSeed(7), seats);
    if (!started.ok) {
      throw new Error(`startMatch rechazó una entrada válida: ${started.error.code}`);
    }

    let state = started.value;
    let turns = 0;
    while (state.round.deck.length > 0) {
      turns += 1;
      if (turns > 200) {
        throw new Error('la ronda no vació el mazo dentro de un número razonable de turnos');
      }
      const currentPlayer = state.round.turn.player;

      const drawn = applyCommand(state, { type: 'Draw', playerId: currentPlayer });
      if (!drawn.ok) {
        throw new Error(`Draw rechazado en el turno de ${currentPlayer}: ${drawn.error.code}`);
      }
      state = drawn.value.state;

      const activePlayer = state.round.players.find(
        (candidate): candidate is ActivePlayer =>
          candidate.id === currentPlayer && candidate.status === 'active',
      );
      if (activePlayer === undefined) {
        throw new Error(`${currentPlayer} no está activo tras robar`);
      }
      const { turn } = state.round;
      if (turn.stage !== 'play') {
        throw new Error(`${currentPlayer} no está en fase de jugar tras robar`);
      }
      const heldCard = activePlayer.held;
      const drawnCard = turn.drawn;

      // El Guardia, el Sacerdote (issue #14), el Barón y la Sirvienta (issue #15) exigen un
      // objetivo o cambian algo más allá del descarte. Con dos jugadores el rival siempre es
      // el único objetivo legal, salvo que esté protegido por la Sirvienta. Para el Guardia se
      // adivina a propósito una carta que el rival no tiene, y el Barón se evita cuando
      // eliminaría al único rival (dejaría a un solo jugador activo, un estado que #19 todavía
      // no sabe cerrar): esta prueba solo verifica que una ronda se puede jugar de punta a
      // punta, no el resultado de adivinar o comparar.
      const opponent = state.round.players.find(
        (candidate): candidate is ActivePlayer =>
          candidate.id !== currentPlayer && candidate.status === 'active',
      );

      /** La carta que le queda en mano a quien juega si descarta `card`. */
      function remainingAfterDiscard(card: CardName): CardName {
        return card === heldCard ? drawnCard : heldCard;
      }

      function wouldEliminateOpponent(card: CardName): boolean {
        return (
          card === 'Baron' &&
          opponent !== undefined &&
          !opponent.protected &&
          CARD[remainingAfterDiscard(card)] !== CARD[opponent.held]
        );
      }

      // Estrategia por defecto: descartar la carta que ya tenía en mano. Se evita solo cuando
      // esa carta es el Barón y eliminaría al único rival.
      const cardToDiscard = wouldEliminateOpponent(heldCard) ? drawnCard : heldCard;

      const targetParams: { readonly target?: PlayerId; readonly guess?: CardName } =
        cardToDiscard === 'Guard' && opponent !== undefined
          ? { target: opponent.id, guess: opponent.held === 'Priest' ? 'Baron' : 'Priest' }
          : (cardToDiscard === 'Priest' || cardToDiscard === 'Baron') && opponent !== undefined
            ? { target: opponent.id }
            : {};

      const command: Command = {
        type: 'Discard',
        playerId: currentPlayer,
        card: cardToDiscard,
        ...targetParams,
      };

      const discarded = applyCommand(state, command);
      if (!discarded.ok) {
        throw new Error(
          `Discard rechazado en el turno de ${currentPlayer}: ${discarded.error.code}`,
        );
      }
      state = discarded.value.state;
    }

    expect(state.round.deck).toHaveLength(0);
    expect(turns).toBeGreaterThan(0);
  });
});

describe('cada personaje sin efecto implementado se descarta sin cambios adicionales', () => {
  it('descartar cualquiera de las cartas sin efecto todavía no cambia el estado más allá del descarte', () => {
    // El Guardia, el Sacerdote (issue #14), el Barón y la Sirvienta (issue #15) ya tienen
    // efecto real: su cobertura vive en effect.test.ts, no aquí — descartarlos exige un
    // objetivo o cambia algo más allá del descarte, así que ya no son "sin efecto".
    const withoutEffect = (Object.keys(CARD) as CardName[]).filter(
      (card) => card !== 'Guard' && card !== 'Priest' && card !== 'Baron' && card !== 'Handmaid',
    );
    for (const card of withoutEffect) {
      const other: CardName = 'Guard';
      const round: Round = {
        number: 1,
        deck: [],
        setAside: 'Princess',
        faceUp: [],
        players: [active('ana', other), active('beto', 'Baron')],
        turn: { stage: 'play', player: 'ana', drawn: card },
      };
      const state = game([ANA, BETO], round);

      const { state: next, events } = applied(state, { type: 'Discard', playerId: 'ana', card });

      expect(events, card).toEqual([
        { type: 'CardDiscarded', player: 'ana', card, audience: 'public' },
        { type: 'TurnChanged', player: 'beto', audience: 'public' },
      ]);
      expect(
        next.round.players.find((candidate) => candidate.id === 'ana'),
        card,
      ).toMatchObject({ held: other, discards: [card] });
    }
  });
});

describe('descartar acepta los parámetros del efecto de la carta', () => {
  it('descartar sin objetivo ni carta adivinada sigue siendo válido', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    const { events } = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });

    expect(events).toEqual([
      { type: 'CardDiscarded', player: 'ana', card: 'King', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ]);
  });

  it('con objetivo y carta adivinada, el resultado es el mismo que sin ellos', () => {
    const state = game([ANA, BETO], PLAY_ROUND);

    const withoutParams = applied(state, { type: 'Discard', playerId: 'ana', card: 'King' });
    const withParams = applied(state, {
      type: 'Discard',
      playerId: 'ana',
      card: 'King',
      target: 'beto',
      guess: 'Guard',
    });

    expect(withParams).toEqual(withoutParams);
  });
});
