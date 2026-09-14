## Context

Ver [proposal.md](proposal.md) — Why. El motor ya tiene el modelo de dos capas del [ADR 0007](../../../docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md) y el barajado por ronda del [ADR 0008](../../../docs/decisions/0008-aleatoriedad-sfc32-semilla-por-ronda.md): `shuffleRound(seed, round)` devuelve el mazo y el generador ya consumido. Falta el constructor que convierte asientos y semilla en un `GameState`.

Restricciones heredadas: `noUncheckedIndexedAccess`, errores como valores, sintaxis borrable, y el ADR 0007 asignando a este issue la custodia de tres invariantes que el tipo no garantiza.

Medido durante la exploración y la propuesta, con el compilador y el runtime del repositorio:

| Medición                                                                                        | Resultado                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Número de jugadores y descubiertas codificados en el tipo (tuplas por cantidad)                 | atrapa los estados inválidos, pero `.map` sobre los jugadores devuelve un arreglo y **rompe la tupla** (`TS2322`); construir desde la entrada del anfitrión da `Player \| undefined` |
| Repartir indexando un mazo `readonly CardName[]`                                                | **no compila**: `CardName \| undefined` al tomar cada carta y `Object is possibly 'undefined'` al tomar quien empieza                                                                |
| Repartir desestructurando un mazo con tipo de tupla de 16, con asientos estrechados por guardas | compila sin `undefined`, sin `throw`; conserva las 16 cartas en runtime                                                                                                              |
| Prototipo del setup con los módulos reales del #8                                               | mazo restante 10 / 12 / 11 para 2 / 3 / 4 jugadores; conserva las 16 cartas en 30 000 semillas por configuración; el sorteo no altera el mazo                                        |
| χ² de quién empieza (30 000 semillas)                                                           | 0,53 / 0,36 / 6,57 para 2 / 3 / 4 jugadores; críticos al 0,1 %: 10,83 / 13,82 / 16,27                                                                                                |

## Goals / Non-Goals

**Goals:**

- Un único constructor de partidas que valide la entrada del anfitrión y deje un estado que cumple, por construcción, las invariantes que el ADR 0007 le asignó.
- Un reparto sin `undefined`, sin `throw` y sin comprobaciones defensivas contra estados imposibles.
- Que el setup completo quede tan congelado como el mazo, porque las partidas guardadas lo reproducen.

**Non-Goals:**

- Cualquier cosa que ocurra después del reparto: robar, eventos, vistas, fin de ronda.

## Decisions

### Validar en el único constructor, no en el tipo

El número de jugadores y la correlación con las descubiertas se validan al construir, no se codifican en `GameState`. La medición mostró que codificarlos en el tipo atrapa lo que promete, pero rompe cada actualización inmutable de los jugadores (`.map` devuelve un arreglo), y eso lo harán casi todas las reglas de la Fase 2.

La validación en el constructor cubre lo mismo porque **una ronda solo nace aquí**: ninguna regla cambia el número de jugadores ni las descubiertas. El ADR 0007 queda como está, con este issue como custodio.

**Alternativa descartada — tuplas por número de jugadores en el modelo**: haría imposible por compilación lo que aquí se valida, a cambio de un costo permanente en cada regla y de un ADR que enmendara el 0007.

### El mazo de la ronda tiene tipo de tupla de dieciséis cartas

```ts
export type FullDeck = readonly [CardName, CardName, /* … dieciséis en total */ CardName];

export function shuffleRound(
  seed: Seed,
  round: number,
): { readonly deck: FullDeck; readonly random: Random };
```

Bajo `noUncheckedIndexedAccess`, tomar una carta por índice de un `readonly CardName[]` da `CardName | undefined`, y el reparto no compila sin guardas o aserciones. Con el mazo tipado como tupla de dieciséis, desestructurarlo da cartas definidas.

`shuffleRound` hace el afinado con **una sola aserción** (`as FullDeck`), respaldada por el requisito ya vigente y ya probado de la capability `deck`: _el barajado conserva las cartas_. Es la misma categoría que `value as Seed` en `toSeed`: un afinado de tipo sólido en un único punto, justificado por una garantía verificada. El cambio es un estrechamiento compatible —una tupla de dieciséis es un `readonly CardName[]`— y no toca nada en runtime, así que la prueba dorada del #8 no se mueve.

**Alternativas descartadas**: indexar con guardas (una rama imposible por carta); cambiar la firma genérica de `shuffle` para que conserve la longitud (exige `as unknown as` dentro del módulo que el #8 declaró sin aserciones); valores por defecto en la desestructuración (fallos silenciosos); `throw` ante un índice fuera de rango (contradice errores como valores).

### Los asientos validados se estrechan con guardas, y el reparto tiene una rama por número de jugadores

```ts
type Seating<T> = readonly [T, T] | readonly [T, T, T] | readonly [T, T, T, T];
function isSeating<T>(items: readonly T[]): items is Seating<T>; // comprueba la longitud en runtime
```

La guarda es una comprobación real, no una aserción: si la longitud no es 2, 3 o 4, el constructor devuelve `InvalidPlayerCount`. Tras ella, cada rama (dos, tres o cuatro jugadores) desestructura asientos y cartas con tipos definidos y construye la ronda explícitamente. Tres ramas son más verbosas que un `map`, pero reflejan la regla —la partida a dos es distinta— y no esconden ningún índice.

Quién empieza se elige sin indexar: un `reduce` sembrado con el primer elemento de la tupla devuelve el elemento del índice sorteado.

### Orden canónico del reparto

Sobre el mazo barajado de la ronda, en este orden: **la primera carta se aparta**; **en la partida a dos, las tres siguientes se descubren**; **después, una carta por asiento en orden de asiento**; **el resto es el mazo**, con el tope en el índice 0, como fija el ADR 0007.

El reparto por asiento no depende de quién empieza: así el sorteo solo fija el turno y no puede desplazar ninguna carta. Este orden entra en el contrato de reproducción y lo congela la prueba dorada del setup.

### Quién empieza la ronda 1 se sortea después del barajado

`startMatch` toma el generador de la ronda 1 que devuelve `shuffleRound(seed, 1)` —ya consumido por el barajado— y sortea un índice uniforme con `uniformInt`. Luego reparte con `dealRound`. La semilla sigue reproduciendo la partida entera, y el requisito de `deck` _ningún sorteo posterior altera el mazo_ se cumple por la forma de la API.

A partir de la ronda 2 empieza el ganador de la anterior (issue #20), así que `dealRound` recibe a quien empieza en lugar de sortearlo.

### `dealRound` devuelve un `Result` y valida lo que recibe

```ts
export function dealRound(
  seed: Seed,
  number: number,
  players: readonly Player[],
  first: PlayerId,
): Result<Round, SetupViolation>;
export function startMatch(seed: Seed, seats: readonly Seat[]): Result<GameState, SetupViolation>;
```

`dealRound` valida el número de jugadores, los identificadores únicos, que quien empieza esté sentado y que el número de ronda sea un entero positivo. Dos razones: es pública en `./server`, y un número de ronda como `1.5` pasaría por `>>> 0` convertido en `1` y repartiría **el mismo mazo que la ronda 1** sin avisar —la misma familia de coerción silenciosa que el tipo `Seed` cerró en el #8—. Para el #20, el `Result` no es una rama imposible que haya que tapar: se propaga, como se propagarán los `Result` del ciclo de turno.

### `SetupViolation` es entrada del anfitrión, no una jugada

```ts
type SetupViolation =
  | { readonly code: 'InvalidPlayerCount'; readonly count: number }
  | { readonly code: 'DuplicatePlayerId'; readonly player: PlayerId }
  | { readonly code: 'UnknownFirstPlayer'; readonly player: PlayerId }
  | { readonly code: 'InvalidRoundNumber'; readonly number: number };
```

Separado de `RuleViolation` con el mismo criterio que `InvalidSeed`: ningún jugador comete estas faltas, las comete quien aloja el motor. Orden de validación, para que el error sea determinista: número de jugadores, luego el primer identificador repetido en orden de asiento, luego el número de ronda, luego quien empieza.

`Seat` es `{ id, name }`: lo que el anfitrión conoce. Las fichas no se aceptan en la entrada; nacen en cero.

### Los jugadores de ronda se construyen recorriendo los de la partida

Cada rama construye los jugadores de ronda a partir de los asientos en su orden: activos, con su carta, sin descartes y sin protección. La alineación de identificadores entre las dos capas —invariante que el ADR 0007 dejó a este issue— queda garantizada por construcción, y además se prueba.

### Congelar el setup con una prueba dorada, comprobada contra el prototipo

Semilla 20260911 y asientos `ana`, `beto`. El prototipo de la exploración, escrito aparte en JavaScript con los módulos reales del #8, produjo:

| Elemento       | Valor                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| Carta apartada | Guard                                                                          |
| Descubiertas   | Priest, Baron, Guard                                                           |
| `ana`          | Princess                                                                       |
| `beto`         | Prince                                                                         |
| Empieza        | `ana`                                                                          |
| Mazo restante  | Handmaid, Priest, Prince, Guard, Guard, King, Countess, Guard, Handmaid, Baron |

Cuadra carta por carta con el mazo dorado del #8. La implementación tiene que reproducirlo sin copiar el código del prototipo; si no coincide, se investiga cuál de las dos difiere antes de tocar la prueba, igual que en el #8.

### Superficies

`Seat`, `SetupViolation`, `startMatch` y `dealRound` viven solo en `./server`: construyen `GameState` y `Round`, que contienen información oculta. `FullDeck` también es solo de servidor. El fixture de frontera se amplía con los nombres nuevos.

### Información oculta y `PlayerView`

El setup coloca por primera vez información oculta real en el estado: la carta apartada (oculta para todos), la carta de cada jugador (oculta para los demás) y el orden del mazo (oculto para todos). Las descubiertas son públicas. **Nada de esto llega a `PlayerView`** en este change: sigue exponiendo solo `deckCount`. Qué ve cada jugador es el issue #10.

### Fe de erratas del ADR 0007

El ADR 0007 cita "estados terminales (#20, #21)" donde son los issues #19 y #20, y "#22 comprueba" donde el custodio es el #21. Se corrigen las referencias y se añade al final una sección de fe de erratas con fecha: la decisión no cambia, así que no hace falta un ADR nuevo, y la corrección queda a la vista. El comentario equivalente de `state.ts` se corrige sin más.

## Risks / Trade-offs

- **La aserción `as FullDeck` depende de que el barajado conserve las cartas** → ese requisito ya lo vigilan las pruebas de `deck`, y la conservación del setup se prueba otra vez aquí.
- **Tres ramas de reparto casi iguales** → es verbosidad a cambio de cero índices sin comprobar; si una cuarta variante apareciera, se revisa. En la edición clásica no la hay.
- **`startMatch` baraja la ronda 1 dos veces** (una para el sorteo, otra dentro de `dealRound`) → dieciséis cartas; el costo es irrelevante y a cambio `dealRound` es la única ruta de reparto.
- **El anfitrión local de la Fase 3 no puede importar `./server`** → `startMatch` es de autoridad por naturaleza; dónde vive el anfitrión que la llama en el navegador se decide antes del issue #22.
- **El setup queda congelado** → cambiar el orden del reparto o el sorteo rompe las partidas guardadas, igual que cambiar el algoritmo del #8.
