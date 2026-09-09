/**
 * El cliente consume únicamente la superficie por defecto del motor (ADR 0005).
 * Si algún día necesitara `@loveletter/engine/server`, esta prueba no lo detecta:
 * lo detecta la verificación 6.3 del change y la regla de ESLint del issue #4.
 */

import { describe, expect, it } from 'vitest';

import { CARD } from '@loveletter/engine';

describe('apps/web habla con el motor', () => {
  it('lee los valores de carta desde la superficie por defecto', () => {
    expect(CARD.Countess).toBe(7);
  });
});
