/**
 * PROVISIONAL — Fase 0.
 *
 * Los ocho personajes con su valor. Es información pública del juego (el valor va
 * impreso en la carta), así que pertenece a la superficie de cliente.
 *
 * Se modela con un objeto `as const` y uniones literales en vez de `enum`: `enum`
 * emite código en tiempo de ejecución y el motor se ejecuta desde su fuente, donde
 * solo se admite sintaxis borrable (ADR 0005).
 *
 * El issue #7 (Modelado de datos) formaliza este módulo junto con el resto del dominio.
 */

export const CARD = {
  Guard: 1,
  Priest: 2,
  Baron: 3,
  Handmaid: 4,
  Prince: 5,
  King: 6,
  Countess: 7,
  Princess: 8,
} as const;

export type CardName = keyof typeof CARD;
export type CardValue = (typeof CARD)[CardName];
