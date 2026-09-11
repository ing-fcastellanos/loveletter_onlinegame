/**
 * El servidor sí accede a la autoridad completa: es quien la custodia (ADR 0004).
 */

import { describe, expect, it } from 'vitest';

import { handOf, project } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

const state: GameState = {
  seed: 7,
  players: [
    { id: 'jugador-1', name: 'Ana', tokens: 0 },
    { id: 'jugador-2', name: 'Beto', tokens: 1 },
  ],
  round: {
    number: 2,
    deck: ['King'],
    setAside: 'Princess',
    faceUp: ['Guard', 'Priest', 'Baron'],
    players: [
      { status: 'active', id: 'jugador-1', held: 'Handmaid', discards: [], protected: false },
      { status: 'active', id: 'jugador-2', held: 'Prince', discards: [], protected: false },
    ],
    turn: { stage: 'play', player: 'jugador-1', drawn: 'Countess' },
  },
};

describe('services/api habla con la superficie de autoridad', () => {
  it('proyecta el estado autoritativo a la vista de un jugador', () => {
    expect(project(state, 'jugador-1')).toEqual({ deckCount: 1 });
  });

  it('lee la mano derivada del jugador en turno', () => {
    expect(handOf(state.round, 'jugador-1')).toEqual(['Handmaid', 'Countess']);
  });
});
