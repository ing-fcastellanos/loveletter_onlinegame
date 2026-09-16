/**
 * Contrato observable del paquete del motor (capability `engine-package`).
 * La contraparte positiva de `boundary.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CARD, DECK, DECK_COMPOSITION } from '@loveletter/engine';
import type { Hand, Player, PlayerView } from '@loveletter/engine';
import { project } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

import { testSeed } from './support/seed.ts';

describe('la vista proyectada sí es alcanzable desde la superficie por defecto', () => {
  it('los tipos públicos son utilizables', () => {
    const view: PlayerView = {
      roundNumber: 1,
      deckCount: 10,
      faceUp: [],
      players: [
        {
          self: true,
          id: 'ana',
          name: 'Ana',
          tokens: 1,
          status: 'active',
          hand: ['Guard', 'Countess'],
          discards: [],
          protected: false,
        },
      ],
      turn: { stage: 'draw', player: 'ana' },
      log: [{ type: 'TurnChanged', player: 'ana', audience: 'public' }],
    };
    const player: Player = { id: 'ana', name: 'Ana', tokens: 1 };
    const hand: Hand = ['Guard', 'Countess'];

    expect([view.deckCount, player.tokens, hand.length]).toEqual([10, 1, 2]);
  });

  it('los valores de las cartas son información pública', () => {
    expect(CARD.Guard).toBe(1);
    expect(CARD.Princess).toBe(8);
  });

  it('la composición del mazo es información pública', () => {
    expect(DECK).toHaveLength(16);
    expect(DECK_COMPOSITION.Guard).toBe(5);
  });
});

describe('la autoridad completa vive tras un subpath explícito', () => {
  it('la proyección no deja pasar ninguna carta que el jugador no puede ver', () => {
    // Turno de Beto, en fase de jugar: robó la Condesa. Proyectamos para Ana.
    const state: GameState = {
      seed: testSeed(987654321),
      players: [
        { id: 'ana', name: 'Ana', tokens: 0 },
        { id: 'beto', name: 'Beto', tokens: 0 },
        { id: 'caro', name: 'Caro', tokens: 0 },
      ],
      round: {
        number: 1,
        deck: ['Guard', 'Priest'],
        setAside: 'Princess',
        faceUp: [],
        players: [
          { status: 'active', id: 'ana', held: 'Baron', discards: [], protected: false },
          { status: 'active', id: 'beto', held: 'King', discards: [], protected: false },
          { status: 'active', id: 'caro', held: 'Handmaid', discards: [], protected: false },
        ],
        turn: { stage: 'play', player: 'beto', drawn: 'Countess' },
      },
      log: [
        { type: 'RoundStarted', round: 1, first: 'ana', audience: 'public' },
        { type: 'CardDrawn', player: 'beto', card: 'Countess', audience: ['beto'] },
      ],
    };

    const view = project(state, 'ana');

    expect(view.deckCount).toBe(2);

    // El registro de eventos también se filtra: el robo de Beto es solo para él.
    expect(view.log).toEqual([
      { type: 'RoundStarted', round: 1, first: 'ana', audience: 'public' },
    ]);

    // Lo que Ana sí ve: su propia carta (Barón) y el turno sin la carta robada por Beto.
    expect(view.players.find((seat) => seat.id === 'ana')).toMatchObject({
      self: true,
      hand: ['Baron'],
    });
    expect(view.turn).toEqual({ stage: 'play', player: 'beto' });

    // Lo que Ana no puede ver: el orden del mazo, la carta apartada, la carta de cada rival
    // y la que Beto acaba de robar. No es una búsqueda de texto: un nombre de carta puede
    // ser legítimamente visible en un campo y oculto en otro del mismo estado. Se comprueba
    // por nombre de campo (ninguno de los prohibidos existe) y por el contenido exacto de
    // los campos que sí pueden llevar una carta.
    const serialized = JSON.stringify(view);
    for (const forbiddenField of ['setAside', 'deck', 'held', 'drawn']) {
      expect(serialized, forbiddenField).not.toContain(`"${forbiddenField}"`);
    }
    for (const seat of view.players) {
      const roundPlayer = state.round.players.find((candidate) => candidate.id === seat.id);
      expect(seat.discards, seat.id).toEqual(roundPlayer?.discards);
    }

    // Y la semilla: con ella se calcula el mazo de cualquier ronda (ADR 0008).
    expect(serialized).not.toContain('987654321');
  });
});

describe('el motor no tiene dependencias de runtime', () => {
  it('su manifiesto no declara ninguna', () => {
    const manifestPath = fileURLToPath(new URL('../package.json', import.meta.url));
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(manifest.dependencies ?? {}).toEqual({});
  });
});
