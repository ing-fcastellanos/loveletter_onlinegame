/**
 * Semillas para pruebas. Desenvuelve `toSeed` y falla ruidosamente ante un valor inválido:
 * en una prueba, una excepción es un fallo de la prueba, no una regla del juego.
 */

import { toSeed } from '@loveletter/engine/server';
import type { Seed } from '@loveletter/engine/server';

export function testSeed(value: number): Seed {
  const result = toSeed(value);
  if (!result.ok) {
    throw new Error(`semilla de prueba inválida: ${value}`);
  }
  return result.value;
}
