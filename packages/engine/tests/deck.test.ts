/**
 * El mazo y su barajado (capability `deck`, ADR 0008).
 *
 * Las pruebas estadísticas usan semillas fijas: dan el mismo resultado en cada ejecución,
 * así que nunca son intermitentes. Una autoprueba con un barajado sesgado demuestra que la
 * prueba de uniformidad discrimina y no se aprueba sola.
 */

import { describe, expect, it } from 'vitest';

import {
  DECK,
  DECK_COMPOSITION,
  roundRandom,
  shuffle,
  shuffleRound,
  toSeed,
} from '@loveletter/engine/server';
import type { CardName, Random } from '@loveletter/engine/server';

import { testSeed } from './support/seed.ts';

const CLASSIC_COMPOSITION: Record<CardName, number> = {
  Guard: 5,
  Priest: 2,
  Baron: 2,
  Handmaid: 2,
  Prince: 2,
  King: 1,
  Countess: 1,
  Princess: 1,
};

/** Semilla y ronda de referencia del algoritmo congelado. */
const REFERENCE_SEED = 20260911;
const REFERENCE_DECK: readonly CardName[] = [
  'Guard',
  'Priest',
  'Baron',
  'Guard',
  'Princess',
  'Prince',
  'Handmaid',
  'Priest',
  'Prince',
  'Guard',
  'Guard',
  'King',
  'Countess',
  'Guard',
  'Handmaid',
  'Baron',
];

/** Valor crítico de χ² con 15 grados de libertad al nivel de significación del 0,1 %. */
const CHI2_CRITICAL_15DF_0_1 = 37.697;

/** Órdenes distinguibles del mazo: 16! / (5! · 2!⁴). */
const DISTINGUISHABLE_DECKS = 10_897_286_400;

function countByCard(cards: readonly CardName[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card] = (counts[card] ?? 0) + 1;
  }
  return counts;
}

function chiSquareOfPrincessPosition(
  deckFor: (sample: number) => readonly CardName[],
  samples: number,
): number {
  const positions = Array.from({ length: 16 }, () => 0);
  for (let sample = 0; sample < samples; sample += 1) {
    const position = deckFor(sample).indexOf('Princess');
    positions[position] = (positions[position] ?? 0) + 1;
  }
  const expected = samples / 16;
  return positions.reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, 0);
}

/** El error clásico: intercambiar cada posición con CUALQUIER otra. Sesgado por construcción. */
function naiveShuffle(cards: readonly CardName[], next: Random): readonly CardName[] {
  const deck = [...cards];
  for (let i = 0; i < deck.length; i += 1) {
    // 16 es potencia de dos: el módulo no añade sesgo; el sesgo es del algoritmo.
    const j = next() % deck.length;
    const a = deck[i];
    const b = deck[j];
    if (a === undefined || b === undefined) {
      throw new Error('índice fuera de rango');
    }
    deck[i] = b;
    deck[j] = a;
  }
  return deck;
}

/**
 * Entrada de la autoprueba, con la Princesa al final. El sesgo del barajado ingenuo depende de
 * dónde empieza cada carta —con la Princesa al principio casi desaparece—, así que la
 * autoprueba fija su propia entrada en vez de depender del orden canónico de DECK.
 */
const PRINCESS_LAST: readonly CardName[] = [
  ...DECK.filter((card) => card !== 'Princess'),
  'Princess',
];

describe('el mazo tiene la composición de la edición clásica', () => {
  it('tiene dieciséis cartas con la distribución clásica', () => {
    expect(DECK).toHaveLength(16);
    expect(countByCard(DECK)).toEqual(CLASSIC_COMPOSITION);
    expect(DECK_COMPOSITION).toEqual(CLASSIC_COMPOSITION);
  });
});

describe('una semilla sin validar no es utilizable', () => {
  it('acepta enteros seguros no negativos', () => {
    for (const value of [0, REFERENCE_SEED, Number.MAX_SAFE_INTEGER]) {
      expect(toSeed(value), String(value)).toEqual({ ok: true, value });
    }
  });

  it('rechaza como resultado, sin lanzar, lo que no es un entero seguro no negativo', () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      expect(() => toSeed(value), String(value)).not.toThrow();
      expect(toSeed(value), String(value)).toEqual({
        ok: false,
        error: { code: 'InvalidSeed', value },
      });
    }
  });
});

describe('el barajado de una ronda es determinista y depende de toda la semilla', () => {
  it('la misma ronda con la misma semilla da el mismo mazo', () => {
    const seed = testSeed(REFERENCE_SEED);

    expect(shuffleRound(seed, 1).deck).toEqual(shuffleRound(seed, 1).deck);
  });

  it('semillas que difieren solo por encima de 2^32 dan mazos distintos', () => {
    const low = shuffleRound(testSeed(REFERENCE_SEED), 1).deck;
    const high = shuffleRound(testSeed(REFERENCE_SEED + 2 ** 32), 1).deck;

    expect(high).not.toEqual(low);

    // El par anterior no detecta un plegado por XOR de las dos mitades (bajos ^ altos): sus
    // mitades bajas coinciden y se pliegan distinto. Este par sí: 0 y 2^32 + 1 se pliegan igual.
    const foldedAway = shuffleRound(testSeed(0), 1).deck;
    const foldedOnto = shuffleRound(testSeed(2 ** 32 + 1), 1).deck;

    expect(foldedOnto).not.toEqual(foldedAway);
  });
});

describe('cada ronda tiene su propio barajado', () => {
  const rounds = 10_000;
  const seed = testSeed(REFERENCE_SEED);
  const decks = Array.from({ length: rounds }, (_, index) => shuffleRound(seed, index + 1).deck);

  it('las rondas de una partida no repiten mazo más de lo que predice el azar', () => {
    // Colisiones esperadas ≈ n² / (2 · mazos distinguibles) ≈ 0,005.
    const distinct = new Set(decks.map((deck) => deck.join())).size;

    expect(rounds - distinct).toBeLessThanOrEqual(2);
  });

  it('la carta superior coincide entre rondas consecutivas con la frecuencia del azar', () => {
    // P(misma carta arriba) = Σ pᵢ² = (5² + 4·2² + 3·1²) / 16² = 44/256 ≈ 0,1719.
    let matches = 0;
    for (let index = 1; index < decks.length; index += 1) {
      if (decks[index]?.[0] === decks[index - 1]?.[0]) {
        matches += 1;
      }
    }

    expect(Math.abs(matches / (rounds - 1) - 44 / 256)).toBeLessThan(0.02);
  });
});

describe('el barajado es uniforme', () => {
  const samples = 16_000;

  it('la posición de la Princesa es uniforme', () => {
    const chiSquare = chiSquareOfPrincessPosition(
      (sample) => shuffleRound(testSeed(sample), 1).deck,
      samples,
    );

    expect(chiSquare).toBeLessThan(CHI2_CRITICAL_15DF_0_1);
  });

  it('la prueba de uniformidad detecta un barajado sesgado', () => {
    const chiSquare = chiSquareOfPrincessPosition(
      (sample) => naiveShuffle(PRINCESS_LAST, roundRandom(testSeed(sample), 1)),
      samples,
    );

    expect(chiSquare).toBeGreaterThan(CHI2_CRITICAL_15DF_0_1);
  });

  it('las coincidencias entre semillas distintas son las del azar', () => {
    const seeds = 10_000;
    const distinct = new Set(
      Array.from({ length: seeds }, (_, sample) => shuffleRound(testSeed(sample), 1).deck.join()),
    ).size;
    const expectedCollisions = seeds ** 2 / (2 * DISTINGUISHABLE_DECKS);

    expect(expectedCollisions).toBeLessThan(0.01);
    expect(seeds - distinct).toBeLessThanOrEqual(2);
  });
});

describe('el barajado conserva las cartas', () => {
  it('el mazo barajado es una permutación del mazo completo', () => {
    const sortedDeck = [...DECK].sort();
    for (let sample = 0; sample < 1_000; sample += 1) {
      expect([...shuffleRound(testSeed(sample), 1).deck].sort()).toEqual(sortedDeck);
    }
  });
});

describe('el algoritmo de barajado está congelado', () => {
  it('la semilla de referencia produce el mazo de referencia', () => {
    // Si esta prueba se pone roja, cambió el generador, el calentamiento, el rechazo, el
    // barajado o el orden de DECK: las partidas guardadas dejarían de reproducirse (ADR 0008).
    expect(shuffleRound(testSeed(REFERENCE_SEED), 1).deck).toEqual(REFERENCE_DECK);
  });
});

describe('ningún sorteo posterior altera el mazo de la ronda', () => {
  it('el mazo es lo primero que sale del azar de la ronda', () => {
    const seed = testSeed(REFERENCE_SEED);

    expect(shuffleRound(seed, 3).deck).toEqual(shuffle(DECK, roundRandom(seed, 3)));
  });

  it('sortear después de barajar no cambia el mazo', () => {
    const seed = testSeed(REFERENCE_SEED);
    const first = shuffleRound(seed, 3);
    for (let draw = 0; draw < 100; draw += 1) {
      first.random();
    }

    expect(shuffleRound(seed, 3).deck).toEqual(first.deck);
  });
});
