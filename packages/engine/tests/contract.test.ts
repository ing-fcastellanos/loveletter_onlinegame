/**
 * Contrato observable del paquete del motor (capability `engine-package`).
 * La contraparte positiva de `boundary.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CARD } from '@loveletter/engine';
import type { Hand, Player, PlayerView } from '@loveletter/engine';
import { project } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

describe('la vista proyectada sí es alcanzable desde la superficie por defecto', () => {
  it('los tipos públicos son utilizables', () => {
    const view: PlayerView = { deckCount: 10 };
    const player: Player = { id: 'ana', name: 'Ana', tokens: 1 };
    const hand: Hand = ['Guard', 'Countess'];

    expect([view.deckCount, player.tokens, hand.length]).toEqual([10, 1, 2]);
  });

  it('los valores de las cartas son información pública', () => {
    expect(CARD.Guard).toBe(1);
    expect(CARD.Princess).toBe(8);
  });
});

describe('la autoridad completa vive tras un subpath explícito', () => {
  it('la proyección no deja pasar ninguna carta que el jugador no puede ver', () => {
    // Turno de Beto, en fase de jugar: robó la Condesa. Proyectamos para Ana.
    const state: GameState = {
      seed: 1,
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
    };

    const view = project(state, 'ana');

    expect(view.deckCount).toBe(2);

    // Lo que Ana no puede ver: el orden del mazo, la carta apartada, la carta de cada rival
    // y la que Beto acaba de robar. Su propia carta (Barón) no se lista: el issue #10 se la
    // mostrará.
    const serialized = JSON.stringify(view);
    for (const hidden of ['Guard', 'Priest', 'Princess', 'King', 'Handmaid', 'Countess']) {
      expect(serialized, hidden).not.toContain(hidden);
    }
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
