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

/**
 * Composición del mazo de la edición clásica: dieciséis cartas. Es información pública
 * —cualquier jugador sabe que hay cinco Guardias— y la presentación la necesita para mostrar
 * qué cartas quedan por salir. `satisfies` exige los ocho personajes sin ensanchar el literal.
 */
export const DECK_COMPOSITION = {
  Guard: 5,
  Priest: 2,
  Baron: 2,
  Handmaid: 2,
  Prince: 2,
  King: 1,
  Countess: 1,
  Princess: 1,
} as const satisfies Record<CardName, number>;

/**
 * El mazo completo en su ORDEN CANÓNICO: los personajes en el orden de `CARD`, cada uno
 * repetido según su composición. Es la entrada del barajado, así que forma parte del
 * algoritmo congelado (ADR 0008): cambiar este orden cambia el mazo de cada partida guardada.
 *
 * La aserción es sólida: las claves de un literal `as const` son exactamente `CardName`, y
 * `Object.keys` las devuelve en su orden de inserción.
 */
export const DECK: readonly CardName[] = (Object.keys(CARD) as CardName[]).flatMap((card) =>
  Array.from({ length: DECK_COMPOSITION[card] }, () => card),
);

/**
 * El mazo completo como tupla de dieciséis cartas. Con este tipo, desestructurar el mazo de
 * una ronda da cartas definidas bajo `noUncheckedIndexedAccess`, sin guardas ni aserciones en
 * quien reparte (ADR 0009).
 */
export type FullDeck = readonly [
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
  CardName,
];
