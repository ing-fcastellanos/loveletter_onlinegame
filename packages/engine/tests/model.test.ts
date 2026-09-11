/**
 * Pruebas de runtime del modelo de estado (capability `game-state`, ADR 0007).
 *
 * Lo que garantiza el compilador está en `game-state.types.ts`; aquí va lo que se observa
 * al ejecutar.
 */

import { describe, expect, it } from 'vitest';

import { CARD, err, handOf, ok } from '@loveletter/engine/server';
import type {
  ActivePlayer,
  CardName,
  Result,
  Round,
  RuleViolation,
  Turn,
} from '@loveletter/engine/server';

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
