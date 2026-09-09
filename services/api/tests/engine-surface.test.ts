/**
 * El servidor sí accede a la autoridad completa: es quien la custodia (ADR 0004).
 */

import { describe, expect, it } from 'vitest';

import { project } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

describe('services/api habla con la superficie de autoridad', () => {
  it('proyecta el estado autoritativo a la vista de un jugador', () => {
    const state: GameState = { deck: ['King'], setAside: 'Princess', seed: 7 };

    expect(project(state, 'jugador-1')).toEqual({ deckCount: 1 });
  });
});
