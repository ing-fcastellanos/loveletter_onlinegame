## Context

Ver [proposal.md](proposal.md) — Why. Estado de partida: `GameState.seed` es un `number` que el [ADR 0007](../../../docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md) dejó como provisional hasta este issue; no existe mazo ni barajado. Restricciones heredadas: sintaxis borrable, `noUncheckedIndexedAccess`, cero dependencias, sin APIs de entorno (la `lib` del motor no tiene ni `console`), aleatoriedad inyectada (`engine-package`) y errores como valores (`openspec/config.yaml`: _la validación devuelve Result, no lanza excepciones_).

Todo lo que sigue se midió durante la exploración, con el compilador y el runtime del repositorio:

| Medición                                                       | Resultado                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Órdenes distinguibles del mazo real (16! entre repeticiones)   | 10 897 286 400 ≈ 2^33,34                                   |
| Cobertura de un generador de 32 bits de estado                 | ≤ 39,4 % de esos mazos                                     |
| Semilla `s` y `s + 2^32` con un generador de 32 bits           | **el mismo mazo**: los bits altos se pierden               |
| La misma prueba con `sfc32` y la semilla en palabras separadas | mazos distintos                                            |
| Intercambio de Durstenfeld `[a[i], a[j]] = [a[j], a[i]]`       | **no compila** (`TS2322`, lectura `CardName \| undefined`) |
| Fisher-Yates original (sacar del montón con `splice`)          | compila sin guarda ni aserción; χ² = 18,0                  |
| χ² de la posición de la Princesa con un barajado ingenuo       | 5801 (crítico al 0,1 % con 15 g. l.: 37,7)                 |
| Carta superior repetida entre rondas consecutivas              | 0,1711 medido · 0,1719 esperado                            |
| Tipo marcado `Seed` y `satisfies` ejecutados por Node          | funcionan; un número crudo no pasa como `Seed`             |

## Goals / Non-Goals

**Goals:**

- Que el mazo de cualquier ronda sea una función pura de (semilla, número de ronda), y que eso quede protegido contra cambios accidentales.
- Que los errores de esta área que fallan en silencio —truncado, sesgo, pérdida de cartas— se conviertan en errores de compilación o en pruebas rojas.
- Que las pruebas estadísticas sean deterministas: semillas fijas, mismo resultado en cada ejecución, cero pruebas intermitentes.

**Non-Goals:**

- Un generador criptográfico. Ver _Risks / Trade-offs_.
- Cualquier uso del azar fuera del barajado: si el #9 necesita sortear quién empieza, lo hace con el generador que entrega este change, después del mazo.

## Decisions

### Composición pública y orden canónico congelado

```ts
export const DECK_COMPOSITION = {
  Guard: 5, Priest: 2, Baron: 2, Handmaid: 2, Prince: 2, King: 1, Countess: 1, Princess: 1,
} as const satisfies Record<CardName, number>;

export const DECK: readonly CardName[] = /* expandido en el orden de CARD */;
```

`satisfies` exige que estén los ocho personajes sin ensanchar el literal, y es sintaxis borrable (Node lo ejecuta desde el fuente). `DECK` se expande en el orden de `CARD`: Guardias, Sacerdotes, Barones, Sirvientas, Príncipes, Rey, Condesa, Princesa. **Ese orden forma parte del algoritmo congelado**: el barajado permuta una entrada, y si cambia la entrada cambia cada mazo.

Ambas constantes van a la superficie de cliente: cualquier jugador sabe que hay cinco Guardias, y la presentación las necesitará para mostrar qué cartas quedan por salir.

### La semilla es un tipo marcado, validado en la frontera

```ts
export type Seed = number & { readonly __brand: 'Seed' };
export type InvalidSeed = { readonly code: 'InvalidSeed'; readonly value: number };
export function toSeed(value: number): Result<Seed, InvalidSeed>; // entero seguro ≥ 0
```

`GameState.seed` pasa a ser `Seed`, y todo lo que baraja recibe `Seed`. Un número sin validar no compila en ninguno de los dos sitios, así que el truncado silencioso deja de ser posible por construcción. El marcado es solo de tipo: no existe en runtime y es sintaxis borrable.

`InvalidSeed` no es una variante de `RuleViolation`: no es una regla del juego que un jugador viole, es una entrada inválida del anfitrión, y ningún jugador la verá.

**De dónde sale una semilla**: la genera quien aloja el motor, fuera de él. Por ejemplo, 53 bits de `crypto.getRandomValues`: `(hi & 0x1f_ffff) * 2 ** 32 + lo`, con `hi` y `lo` de un `Uint32Array(2)`. El motor nunca la genera; solo la valida.

**Alternativas descartadas**: `number` con un `Result` en cada barajado (quien ya validó al crear la partida tendría que manejar un error imposible) y `number` con una excepción (contradice la convención de errores como valores). Elección registrada por el usuario durante la propuesta.

### `sfc32`, con la semilla en palabras separadas

```ts
function sfc32(a: number, b: number, c: number, d: number): Random {
  // 128 bits de estado; tras sembrar se descartan 15 salidas para mezclar
}

export function roundRandom(seed: Seed, round: number): Random {
  return sfc32(seed >>> 0, Math.floor(seed / 2 ** 32) >>> 0, round >>> 0, 0x9e3779b9);
}
```

Cuatro palabras de 32 bits: los 32 bits bajos de la semilla, sus 21 bits altos, el número de ronda y una constante. **Nada se pliega**: ni la semilla se reduce a 32 bits ni la ronda se mezcla encima de ella con un XOR. Con 128 bits de estado, el generador puede producir todos los mazos distinguibles.

**Alternativa descartada — `mulberry32`**: más simple, pero 32 bits de estado alcanzan como máximo el 39,4 % de los mazos, y cualquier semilla mayor que 2^32 se trunca en silencio.

### El mazo se deriva por ronda; no hay estado de generador en la partida

En la edición clásica lo único aleatorio de una ronda es el barajado: el Príncipe, la carta apartada y el turno son deterministas. Por eso `GameState` guarda solo la semilla de partida, y el azar de la ronda `n` es `roundRandom(seed, n)`. Consecuencias: ningún comando arrastra estado de generador; cualquier ronda se reproduce por separado, sin reproducir las anteriores; y el `seed` que el ADR 0007 dejó como provisional resulta suficiente.

El número de ronda lo produce el propio motor (desde 1, lo fija el #9 y lo avanza el #21), así que no se valida en runtime; `>>> 0` es la identidad para todo entero entre 1 y 2^32 − 1.

### Enteros uniformes por rechazo

`uniformInt(next, n)` descarta las salidas que caen por encima del mayor múltiplo de `n` que cabe en 2^32. `Math.floor(x / 2^32 * n)` o `x % n` introducen un sesgo minúsculo pero real; el rechazo lo elimina y, para `n ≤ 16`, casi nunca necesita una segunda extracción.

### Fisher-Yates original, no el de Durstenfeld

```ts
export function shuffle<T>(items: readonly T[], next: Random): readonly T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length > 0) out.push(...pool.splice(uniformInt(next, pool.length), 1));
  return out;
}
```

Sacar cada elemento al azar del montón restante produce una permutación uniforme: es el método de Fisher y Yates de 1938. La variante de Durstenfeld, que intercambia en sitio, no compila con `noUncheckedIndexedAccess`, y hacerla compilar exigía una guarda con `throw` para un índice imposible. `splice` devuelve un arreglo, así que no hay `undefined` que manejar. El costo cuadrático es irrelevante con 16 elementos.

Es genérico para que el #9 pueda barajar otras cosas si lo necesita; el motor lo usa con cartas.

### El mazo es lo primero que sale del azar de la ronda

```ts
export function shuffleRound(
  seed: Seed,
  round: number,
): { readonly deck: readonly CardName[]; readonly random: Random };
```

Devuelve el mazo **y** el generador de la ronda ya consumido por el barajado. Si el #9 sortea quién empieza, lo hará con ese `random`, necesariamente después del mazo. El orden de consumo deja de ser una disciplina y queda fijado por la forma de la API: no hay manera de sortear algo antes de barajar y desplazar así el mazo de referencia.

### Congelar el algoritmo con una prueba dorada

El #29 guardará cada partida como semilla más comandos. Si cambia el generador, el calentamiento, el rechazo, el barajado o el orden de `DECK`, todas esas partidas se reproducirían distinto. Una prueba fija el mazo exacto de la **ronda 1 con la semilla 20260911**. La exploración lo calculó con una implementación independiente en el scratchpad:

```
Priest Priest Prince Guard Guard Baron Guard Guard Princess Handmaid Countess Baron Prince Handmaid Guard King
```

La implementación del change tiene que reproducirlo sin copiar el código de la exploración: dos escrituras independientes que coinciden son mejor evidencia que una prueba escrita a partir de su propio resultado.

El campo de versión del algoritmo no se añade todavía; lo decide el #29, cuando haya partidas que versionar.

### Pruebas estadísticas deterministas

Semillas fijas, así que el χ² y los conteos salen idénticos en cada ejecución: una prueba estadística que nunca es intermitente. Para que no se aprueben solas, la batería incluye una **autoprueba**: el mismo χ² sobre un barajado ingenuo, escrito dentro de la prueba, tiene que rechazar la uniformidad. Los tamaños se eligen para que el conjunto corra en menos de un segundo.

### Superficies

| Símbolo                                                                             | Superficie         |
| ----------------------------------------------------------------------------------- | ------------------ |
| `DECK`, `DECK_COMPOSITION`                                                          | cliente y servidor |
| `Seed`, `InvalidSeed`, `toSeed`, `Random`, `roundRandom`, `shuffle`, `shuffleRound` | **solo servidor**  |

El fixture de frontera se amplía para exigir que ninguno de los símbolos de servidor sea alcanzable desde `@loveletter/engine`.

### Información oculta y `PlayerView`

La semilla es la información oculta más sensible de toda la partida: con ella se calcula el mazo de cualquier ronda, pasada o futura. `PlayerView` no cambia (sigue exponiendo solo `deckCount`), y la prueba de proyección se amplía para exigir que la vista serializada no contenga la semilla.

### Consumidores del tipo nuevo

Las pruebas de runtime obtienen semillas con un ayudante de pruebas que desenvuelve `toSeed` y falla ruidosamente ante un valor inválido; en código de prueba una excepción es un fallo de prueba, no una regla del juego. El archivo de contratos de tipo, que no se ejecuta, declara una `Seed` con `declare const`. El esqueleto de `services/api` desenvuelve `toSeed` explícitamente.

## Risks / Trade-offs

- **`sfc32` no es criptográfico y la semilla tiene 53 bits** → en una partida en línea, un rival que observa cartas podría intentar recuperar la semilla por fuerza bruta y, con ella, predecir el resto del mazo y las rondas siguientes. Con 2^53 semillas es costoso pero no inalcanzable con hardware dedicado. Irrelevante mientras el juego sea local; el marcado `Seed` permite ampliar la semilla o derivarla de un generador criptográfico en la Fase 4 sin cambiar las firmas. Registrado en la re-evaluación del ADR 0008.
- **Cambiar el algoritmo rompe las partidas guardadas** → prueba dorada ahora; campo de versión en el #29.
- **El número de ronda no se valida en runtime** → lo produce el motor; un valor fuera de rango sería un bug del #9 o del #21, no una entrada externa.
- **Las pruebas estadísticas usan tamaños moderados** → detectan sesgos groseros (la autoprueba lo demuestra) pero no sesgos sutiles del generador; no pretenden ser una batería tipo TestU01, y `sfc32` ya la pasa en la literatura.
- **`GameState.seed` cambia de tipo (BREAKING)** → solo lo construyen las pruebas del motor y el esqueleto de `services/api`, que se actualizan aquí.
