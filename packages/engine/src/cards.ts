/**
 * Los ocho personajes de la edición clásica y su valor.
 *
 * El valor va impreso en la carta: es información pública y pertenece a las dos
 * superficies del paquete.
 *
 * Objeto `as const` con uniones literales en vez de `enum`: `enum` emite código en tiempo
 * de ejecución y el motor se ejecuta desde su fuente, donde solo se admite sintaxis
 * borrable (ADR 0005).
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
