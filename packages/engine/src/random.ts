/**
 * El azar del motor (ADR 0008).
 *
 * En la edición clásica lo único aleatorio de una ronda es el barajado. Por eso la partida
 * guarda solo su semilla, y el azar de la ronda `n` se deriva de (semilla, n): no hay estado
 * de generador que arrastrar entre comandos, y cualquier ronda se reproduce por separado.
 *
 * Todo lo de este módulo cambia el mazo de las partidas guardadas si se toca: el generador,
 * su calentamiento, el rechazo, el barajado y el orden canónico de `DECK`. La prueba dorada
 * lo vigila.
 */

import { DECK } from './cards.ts';
import type { CardName } from './cards.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';

/**
 * Semilla de una partida: un entero seguro no negativo que solo se obtiene con `toSeed`. El
 * marcado es solo de tipo —no existe en runtime— e impide usar un número sin validar, y con
 * él el truncado silencioso de sus bits altos.
 *
 * Es información oculta: con la semilla se calcula el mazo de cualquier ronda de la partida.
 */
export type Seed = number & { readonly __brand: 'Seed' };

/** Una semilla rechazada. No es una regla del juego: es una entrada inválida del anfitrión. */
export type InvalidSeed = { readonly code: 'InvalidSeed'; readonly value: number };

/** Un generador: cada llamada devuelve un entero sin signo de 32 bits. */
export type Random = () => number;

/**
 * Valida un número como semilla. La genera quien aloja el motor (por ejemplo, 53 bits de
 * `crypto.getRandomValues`); el motor nunca la genera, solo la valida.
 */
export function toSeed(value: number): Result<Seed, InvalidSeed> {
  if (!Number.isSafeInteger(value) || value < 0) {
    return err({ code: 'InvalidSeed', value });
  }
  return ok(value as Seed);
}

/**
 * sfc32 ("Small Fast Counting", PractRand): 128 bits de estado, suficientes para producir
 * los ≈ 2^33,3 mazos distinguibles. Tras sembrar se descartan 15 salidas para mezclar el
 * estado. Todas las sumas son exactas antes de reducir con `>>> 0`: sus operandos no pasan
 * de 2^35, muy por debajo de 2^53.
 */
function sfc32(seedA: number, seedB: number, seedC: number, seedD: number): Random {
  let a = seedA >>> 0;
  let b = seedB >>> 0;
  let c = seedC >>> 0;
  let d = seedD >>> 0;
  const next: Random = () => {
    const t = (a + b + d) >>> 0;
    d = (d + 1) >>> 0;
    a = (b ^ (b >>> 9)) >>> 0;
    b = (c + (c << 3)) >>> 0;
    c = (((c << 21) | (c >>> 11)) + t) >>> 0;
    return t;
  };
  for (let i = 0; i < 15; i += 1) {
    next();
  }
  return next;
}

/**
 * El generador de una ronda. Cada dato ocupa su propia palabra de estado —los 32 bits bajos
 * de la semilla, sus 21 bits altos, el número de ronda y una constante— y nada se pliega: ni
 * la semilla se reduce a 32 bits ni la ronda se mezcla encima de ella.
 *
 * El número de ronda lo produce el propio motor (desde 1); `>>> 0` es la identidad para todo
 * entero entre 1 y 2^32 − 1.
 */
export function roundRandom(seed: Seed, round: number): Random {
  return sfc32(seed >>> 0, Math.floor(seed / 2 ** 32) >>> 0, round >>> 0, 0x9e3779b9);
}

/**
 * Entero uniforme en [0, bound), por rechazo: descarta las salidas por encima del mayor
 * múltiplo de `bound` que cabe en 2^32, así que no hay sesgo de módulo. Interno al paquete:
 * no se publica en ninguna superficie.
 */
export function uniformInt(next: Random, bound: number): number {
  const limit = Math.floor(2 ** 32 / bound) * bound;
  let value = next();
  while (value >= limit) {
    value = next();
  }
  return value % bound;
}

/**
 * Fisher-Yates en su forma original (1938): sacar cada elemento al azar del montón restante.
 * Produce una permutación uniforme. No se usa la variante de Durstenfeld, que intercambia en
 * sitio: con `noUncheckedIndexedAccess` no compila sin una guarda para un índice imposible.
 * `splice` devuelve un arreglo, así que aquí no hay `undefined` que manejar.
 */
export function shuffle<T>(items: readonly T[], next: Random): readonly T[] {
  const pool = [...items];
  const shuffled: T[] = [];
  while (pool.length > 0) {
    shuffled.push(...pool.splice(uniformInt(next, pool.length), 1));
  }
  return shuffled;
}

/**
 * El mazo de una ronda y el generador de esa ronda, ya consumido por el barajado. Cualquier
 * otro sorteo de la ronda sale de `random`, necesariamente después del mazo, así que no puede
 * alterarlo.
 */
export function shuffleRound(
  seed: Seed,
  round: number,
): { readonly deck: readonly CardName[]; readonly random: Random } {
  const random = roundRandom(seed, round);
  const deck = shuffle(DECK, random);
  return { deck, random };
}
