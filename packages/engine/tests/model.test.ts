/**
 * Pruebas de runtime del modelo de estado (capability `game-state`, ADR 0007).
 *
 * Lo que garantiza el compilador está en `game-state.types.ts`; aquí va lo que se observa
 * al ejecutar.
 */

import { describe, expect, it } from 'vitest';

import { CARD, dealRound, err, handOf, ok } from '@loveletter/engine/server';
import type {
  ActivePlayer,
  CardName,
  GameEvent,
  GameState,
  Player,
  Result,
  Round,
  RuleViolation,
  Turn,
} from '@loveletter/engine/server';

import { testSeed } from './support/seed.ts';

function active(id: string, held: CardName): ActivePlayer {
  return { status: 'active', id, held, discards: [], protected: false };
}

/** Ana y Beto activos; Caro eliminada tras descartar la Princesa. */
function round(turn: Turn): Round {
  return {
    number: 1,
    deck: ['Guard', 'Priest'],
    setAside: 'King',
    faceUp: [],
    players: [
      active('ana', 'Guard'),
      active('beto', 'Baron'),
      { status: 'eliminated', id: 'caro', discards: ['Princess'] },
    ],
    turn,
  };
}

const anaYaRobo: Turn = { stage: 'play', player: 'ana', drawn: 'Countess' };
const anaSinRobar: Turn = { stage: 'draw', player: 'ana' };

describe('los ocho personajes y su valor', () => {
  it('son exactamente ocho, con valores del 1 al 8 en el orden del juego clásico', () => {
    expect(Object.entries(CARD)).toEqual([
      ['Guard', 1],
      ['Priest', 2],
      ['Baron', 3],
      ['Handmaid', 4],
      ['Prince', 5],
      ['King', 6],
      ['Countess', 7],
      ['Princess', 8],
    ]);
  });
});

describe('una jugada ilegal se representa como valor', () => {
  it('ok produce un éxito cuyo valor se lee tras comprobar que lo es', () => {
    const result: Result<number, RuleViolation> = ok(3);

    expect(result.ok && result.value).toBe(3);
  });

  it('err produce una violación con código y datos, sin texto', () => {
    const result: Result<number, RuleViolation> = err({
      code: 'NotYourTurn',
      player: 'beto',
      current: 'ana',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'NotYourTurn', player: 'beto', current: 'ana' },
    });
  });
});

describe('la carta robada existe solo durante la fase de jugar', () => {
  it('tras robar, el jugador en turno tiene dos cartas en la mano', () => {
    expect(handOf(round(anaYaRobo), 'ana')).toEqual(['Guard', 'Countess']);
  });

  it('tras robar, los demás jugadores siguen con una carta', () => {
    expect(handOf(round(anaYaRobo), 'beto')).toEqual(['Baron']);
  });

  it('antes de robar, el jugador en turno tiene una sola carta', () => {
    expect(handOf(round(anaSinRobar), 'ana')).toEqual(['Guard']);
  });
});

describe('un jugador eliminado no tiene carta, pero conserva sus descartes', () => {
  it('un jugador eliminado no tiene mano', () => {
    expect(handOf(round(anaYaRobo), 'caro')).toBeNull();
  });

  it('sus descartes siguen presentes en el estado de la ronda', () => {
    const caro = round(anaYaRobo).players.find((player) => player.id === 'caro');

    expect(caro?.discards).toEqual(['Princess']);
  });

  it('un identificador desconocido tampoco tiene mano', () => {
    expect(handOf(round(anaYaRobo), 'nadie')).toBeNull();
  });
});

describe('el estado lleva un registro de eventos que crece con la partida', () => {
  it('el registro sobrevive al reparto de una ronda nueva', () => {
    const players: readonly Player[] = [
      { id: 'ana', name: 'Ana', tokens: 0 },
      { id: 'beto', name: 'Beto', tokens: 0 },
    ];
    const roundOneEvents: readonly GameEvent[] = [
      { type: 'RoundStarted', round: 1, first: 'ana', audience: 'public' },
      { type: 'TurnChanged', player: 'beto', audience: 'public' },
    ];
    const roundTwoEvent: GameEvent = {
      type: 'RoundStarted',
      round: 2,
      first: 'beto',
      audience: 'public',
    };

    // dealRound no recibe ni produce eventos: quien construye el GameState siguiente es
    // quien decide qué le agrega al registro.
    const dealt = dealRound(testSeed(7), 2, players, 'beto');
    if (!dealt.ok) {
      throw new Error(`dealRound rechazó una entrada válida: ${dealt.error.code}`);
    }

    const state: GameState = {
      seed: testSeed(7),
      players,
      round: dealt.value,
      log: [...roundOneEvents, roundTwoEvent],
    };

    expect(state.log.slice(0, roundOneEvents.length)).toEqual(roundOneEvents);
    expect(state.log.at(-1)).toEqual(roundTwoEvent);
  });
});
