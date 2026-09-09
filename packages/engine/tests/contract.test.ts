/**
 * Contrato observable del paquete del motor (capability `engine-package`).
 * La contraparte positiva de `boundary.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CARD } from '@loveletter/engine';
import type { PlayerView } from '@loveletter/engine';
import { project } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

describe('la vista proyectada sí es alcanzable desde la superficie por defecto', () => {
  it('el tipo de la vista de jugador es utilizable', () => {
    const view: PlayerView = { deckCount: 10 };

    expect(view.deckCount).toBe(10);
  });

  it('los valores de las cartas son información pública', () => {
    expect(CARD.Guard).toBe(1);
    expect(CARD.Princess).toBe(8);
  });
});

describe('la autoridad completa vive tras un subpath explícito', () => {
  it('la proyección no deja pasar el mazo ni la carta apartada', () => {
    const state: GameState = { deck: ['Guard', 'Priest'], setAside: 'Princess', seed: 1 };

    const view = project(state, 'jugador-1');

    expect(view.deckCount).toBe(2);
    expect(JSON.stringify(view)).not.toContain('Princess');
    expect(JSON.stringify(view)).not.toContain('Guard');
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
