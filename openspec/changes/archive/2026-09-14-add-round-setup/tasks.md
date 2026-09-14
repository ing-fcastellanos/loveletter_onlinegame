## 1. El mazo de la ronda con tipo de tupla

- [x] 1.1 Añadir a `packages/engine/src/cards.ts` el tipo `FullDeck`, una tupla de dieciséis `CardName`; verificar con `npm run typecheck`. **Resultado:** `npm run typecheck` limpio.
- [x] 1.2 Afinar en `packages/engine/src/random.ts` el tipo de `shuffleRound` a `{ deck: FullDeck; random: Random }` con una sola aserción `as FullDeck`, comentada con el requisito de `deck` que la respalda; verificar con `npm run typecheck` y que `npm test` sigue verde, incluida la prueba dorada del #8 (sin cambio en runtime). **Resultado:** typecheck con 0 errores y las 30 pruebas existentes del motor en verde, incluida la prueba dorada del #8: el afinado no cambió nada en runtime.

## 2. El setup (`packages/engine/src/setup.ts`)

- [x] 2.1 Crear `packages/engine/src/setup.ts` con `Seat`, `SetupViolation` (las cuatro variantes de `design.md`), `Seating<T>` y la guarda `isSeating`, que comprueba la longitud en runtime sin aserciones; verificar con `npm run typecheck`.
- [x] 2.2 Implementar la validación en el orden fijado por `design.md` —número de jugadores, primer identificador repetido en orden de asiento, número de ronda, quien empieza—, devolviendo `Result` y sin lanzar; su comportamiento se prueba en las tareas 4.1, 4.2 y 4.8. **Nota:** `InvalidRoundNumber` rechaza también los enteros mayores que 2^32 − 1, que la spec no menciona: `roundRandom` los reduciría con `>>> 0` y repartiría en silencio el mazo de otra ronda. Es una restricción adicional, no contraria a la spec.
- [x] 2.3 Implementar `dealRound(seed, number, players, first)` con una rama por número de jugadores que desestructura el mazo de `shuffleRound` y los asientos: apartada, descubiertas solo a dos, una carta por asiento en orden de asiento, mazo restante y `turn = { stage: 'draw', player: first }`. Verificar con `npm run typecheck` y con `grep` que el módulo no contiene `throw`, `!` como aserción de no nulo ni `as` salvo `as const`. **Resultado:** `setup.ts` sin `throw`, sin aserciones de no nulo y sin `as`. Las ramas se estrechan por `seating.length`; el caso de cuatro jugadores es lo que queda tras descartar dos y tres, así que no hay una rama final imposible.
- [x] 2.4 Implementar `startMatch(seed, seats)`: jugadores con fichas en cero, sorteo de quién empieza con `uniformInt` sobre el generador que devuelve `shuffleRound(seed, 1)` —elegido con un `reduce` sin indexar— y reparto con `dealRound(seed, 1, …)`; verificar con `npm run typecheck`. **Nota:** `startMatch` propaga el `Result` de `dealRound` en lugar de tratarlo como imposible.
- [x] 2.5 Publicar en `packages/engine/src/server.ts` `Seat`, `SetupViolation`, `FullDeck`, `startMatch` y `dealRound`; `packages/engine/src/client.ts` no cambia. Verificar que los barriles no contienen lógica. **Resultado:** barriles sin sentencias ejecutables; `client.ts` intacto.

## 3. Frontera

- [x] 3.1 Ampliar `packages/engine/tests/fixtures/forbidden-import.ts` y la lista de `packages/engine/tests/boundary.test.ts` con `startMatch`, `dealRound`, `Seat`, `SetupViolation` y `FullDeck`; verificar con `npm test --workspace packages/engine`. **Resultado:** los cinco nombres nuevos son inalcanzables desde la superficie por defecto; la prueba de frontera pasa.

## 4. Pruebas de runtime (`packages/engine/tests/setup.test.ts`)

- [x] 4.1 Número de jugadores: 2, 3 y 4 construyen partida; 0, 1 y 5 se rechazan con `InvalidPlayerCount` y la cantidad, sin lanzar; verificar con `npm test`.
- [x] 4.2 Identificadores únicos: un identificador repetido se rechaza con `DuplicatePlayerId` identificando el primero repetido en orden de asiento, sin lanzar; verificar con `npm test`. **Resultado:** con `ana, beto, beto, ana` se rechaza `beto`, el primero repetido en orden de asiento.
- [x] 4.3 Partida desde cero: fichas en cero, ronda 1, y jugadores de ronda con los mismos identificadores y en el mismo orden que los de la partida, todos activos, sin descartes y sin protección; verificar con `npm test`.
- [x] 4.4 Cartas fuera de juego: la apartada es la primera carta de `shuffleRound(seed, 1).deck` con 2, 3 y 4 jugadores; con 2, las descubiertas son la segunda, tercera y cuarta; con 3 y 4 no hay; verificar con `npm test`.
- [x] 4.5 Reparto por asiento: cada asiento sostiene la carta que le corresponde en orden de asiento, y repartir con `dealRound` indicando a cada jugador como quien empieza deja las mismas cartas en cada asiento; verificar con `npm test`. **Desviación:** la carta de cada asiento se comprueba por identificador de jugador, no por posición (mutación 5.5).
- [x] 4.6 Mazo restante: 10, 12 y 11 cartas con 2, 3 y 4 jugadores; y para un conjunto de semillas, apartada + descubiertas + cartas de los jugadores + mazo restante es exactamente la composición del mazo; verificar con `npm test`. **Resultado:** conservación comprobada en 500 semillas por cada número de jugadores.
- [x] 4.7 Sorteo de quién empieza: el turno está en `draw` y pertenece a un jugador sentado; el reparto coincide con el mazo barajado de la ronda 1; y χ² de quién empieza sobre un conjunto fijo de semillas por debajo del crítico al 0,1 % (1, 2 y 3 g. l.: 10,828 / 13,816 / 16,266) para 2, 3 y 4 jugadores; verificar con `npm test`. **Resultado:** χ² sobre 4000 semillas por cada número de jugadores, bajo los críticos.
- [x] 4.8 `dealRound` con quien empieza dado: el turno pertenece a quien se indica; con número de ronda `n` el reparto sale de `shuffleRound(seed, n)` y la ronda lleva ese número; se rechazan, sin lanzar, quien empieza no sentado (`UnknownFirstPlayer`), números de ronda 0, -1 y 1,5 (`InvalidRoundNumber`) y jugadores inválidos; verificar con `npm test`. **Desviación:** al revisar la prueba se encontró una aserción de no nulo (`players[0] ?? players[1]!`) que además solo comprobaba `.ok === false`; se reemplazó por un duplicado explícito y el error exacto `DuplicatePlayerId`. La prueba también rechaza 2^32 como número de ronda (ver 2.2) y verifica el orden de validación. El mazo por número de ronda también se comprueba por identificador (mutación 5.5).
- [x] 4.9 Determinismo y prueba dorada: la misma semilla y los mismos asientos producen partidas idénticas; la semilla 20260911 con `ana` y `beto` produce exactamente el setup de referencia de `design.md`. Si no coincide, **no** se ajusta la prueba: se investiga si difiere la implementación o el prototipo, y se registra aquí. Verificar con `npm test`. **La comprobación cruzada coincidió a la primera:** el setup de `startMatch` para la semilla 20260911 con `ana` y `beto` es idéntico, carta por carta, al que produjo el prototipo de la exploración, escrito aparte. `setup.test.ts` completo: 22 pruebas en 263 ms. **Desviación:** la prueba dorada compara la carta de cada jugador por identificador —`{ ana: 'Princess', beto: 'Prince' }`—, no por posición (mutación 5.5).

## 5. Verificación por mutación

- [x] 5.1 Descubrir temporalmente tres cartas también con tres jugadores y confirmar que la prueba de cartas fuera de juego (4.4) y la de mazo restante (4.6) se ponen rojas; revertir. **Resultado:** rojas «con tres o cuatro jugadores no se descubre ninguna carta» y «ninguna carta se pierde ni se duplica».
- [x] 5.2 Repartir temporalmente en orden inverso de asiento y confirmar que la prueba de reparto por asiento (4.5) y la dorada (4.9) se ponen rojas; revertir. **Resultado:** rojas el reparto por asiento, «el número de ronda determina el mazo» y la prueba dorada.
- [x] 5.3 Quitar temporalmente el sorteo (empieza siempre el primer asiento) y confirmar que la uniformidad de quién empieza (4.7) se pone roja; revertir. **Resultado:** roja la uniformidad de quién empieza.
- [x] 5.4 Quitar temporalmente la validación del número de ronda y confirmar que la prueba de números de ronda inválidos (4.8) se pone roja; revertir. **Resultado:** rojas «el número de ronda debe ser un entero positivo» y la prueba del orden de validación.
- [x] 5.5 Construir temporalmente los jugadores de ronda en orden inverso y confirmar que la prueba de alineación (4.3) se pone roja; revertir. Todas las reversiones se hacen desde una copia y se comprueban por sha256. **Resultado, y un hallazgo:** en la primera pasada solo se puso roja la prueba de alineación. Las de reparto por asiento y la dorada comparaban cartas por posición, así que una ronda desalineada seguía afirmando que `ana` tenía la Princesa aunque la tuviera `beto`. Se reforzaron para comparar por identificador (ver 4.5, 4.8 y 4.9) y la mutación repetida pone rojas cuatro pruebas: alineación, reparto por asiento, mazo por número de ronda y dorada. La 5.2 repetida sigue detectándose.

## 6. Documentación

- [x] 6.1 Escribir `docs/decisions/0009-preparacion-de-ronda-reparto-y-sorteo.md` con la medición, el orden canónico del reparto, el sorteo tras el barajado, la validación en el constructor (y por qué no en el tipo), el afinado `FullDeck` y la re-evaluación; actualizar `docs/decisions/_index.md`.
- [x] 6.2 Corregir en `docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md` las cuatro referencias a issues equivocadas (#20/#21 → #19/#20; #22 → #21), añadir al final una sección "Fe de erratas" fechada que diga qué se corrigió y que la decisión no cambia, y corregir el comentario equivalente de `packages/engine/src/state.ts`; verificar con `grep` que no queda ninguna referencia equivocada. **Resultado:** las cuatro referencias corregidas y sin ninguna equivocada según `grep`. **Añadido:** el índice de ADRs marca el 0007 como `Accepted — fe de erratas 2026-09-14`, para que la corrección se vea también desde ahí.
- [x] 6.3 Actualizar `CLAUDE.md` (el setup en la sección del modelo y "Cosas que no existen todavía") y `openspec/config.yaml` (convenciones del setup); verificar que no queda ninguna afirmación falsa. **Añadido:** `CLAUDE.md` gana una subsección "Preparación de ronda" junto a la del modelo de estado.

## 7. Verificación

- [x] 7.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [x] 7.2 Mapear cada escenario de `specs/round-setup/spec.md` a su verificación y anotar la tabla.
- [x] 7.3 Confirmar que `PlayerView` no expone nada de la información oculta que el setup coloca (carta apartada, cartas ajenas, orden del mazo) y que ninguna operación de setup es alcanzable desde la superficie de cliente, citando las tareas 3.1 y la prueba de proyección existente.
- [x] 7.4 Redactar aquí la nota que se publicará con el PR, en el issue #9: la parte de su criterio sobre las vistas se cumple en el #10. Cerrar registrando las desviaciones del plan y `openspec validate add-round-setup --strict` en verde.

### Evidencia

**7.1 — Clon limpio** (`git clone -b feat/round-setup`), sin pasos intermedios:

```
npm run lint          PASA
npm run format:check  PASA
npm run typecheck     PASA
npm run test          PASA
Test Files  5 passed (5)   Tests  52 passed (52)   # packages/engine
Test Files  1 passed (1)   Tests  1 passed (1)   # apps/web
Test Files  1 passed (1)   Tests  2 passed (2)   # services/api
```

**7.2 — Cada escenario de `specs/round-setup/spec.md` y su verificación** (en `setup.test.ts` salvo que se indique):

| Requirement · Scenario                                           | Verificado por                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Jugadores · dos, tres o cuatro inician una partida               | construye partida con 2, 3 y 4 asientos                                                            |
| Jugadores · una cantidad fuera de rango se rechaza               | 0, 1 y 5 asientos → `InvalidPlayerCount` con la cantidad, sin lanzar                               |
| Identificadores · un repetido se rechaza                         | `ana, beto, beto, ana` → `DuplicatePlayerId` con `beto`; también en `dealRound`                    |
| Desde cero · fichas en cero y primera ronda                      | fichas en cero y ronda 1, con 2, 3 y 4 jugadores                                                   |
| Desde cero · los jugadores de la ronda coinciden                 | mismos ids en el mismo orden, activos, sin descartes ni protección; mutación 5.5                   |
| Fuera de juego · la apartada es la primera del mazo              | contra `shuffleRound(seed, 1).deck[0]`, con 2, 3 y 4 jugadores                                     |
| Fuera de juego · a dos se descubren la segunda a la cuarta       | contra `deck.slice(1, 4)`                                                                          |
| Fuera de juego · con tres o cuatro no se descubre ninguna        | mutación 5.1                                                                                       |
| Por asiento · reparto en orden de asiento                        | por identificador contra el mazo de la ronda; mutaciones 5.2 y 5.5                                 |
| Por asiento · quien empieza no cambia lo que recibe cada asiento | `dealRound` con cada jugador como quien empieza, por identificador                                 |
| Mazo · tamaño según el número de jugadores                       | 10, 12 y 11                                                                                        |
| Mazo · ninguna carta se pierde ni se duplica                     | 500 semillas por cada número de jugadores; mutación 5.1                                            |
| Sorteo · la ronda empieza con el sorteado antes de robar         | turno en `draw` con un jugador sentado                                                             |
| Sorteo · el sorteo no altera el mazo                             | la ronda de `startMatch` es idéntica, salvo el turno, a la de `dealRound` sin sorteo               |
| Sorteo · es uniforme                                             | χ² sobre 4000 semillas por cada número de jugadores, bajo los críticos; mutación 5.3               |
| Quien empieza dado · la ronda empieza con quien se indica        | cada jugador de una partida a tres                                                                 |
| Quien empieza dado · el número de ronda determina el mazo        | ronda 5 contra `shuffleRound(seed, 5)`, por identificador                                          |
| Quien empieza dado · debe estar sentado                          | `zoe` → `UnknownFirstPlayer`, sin lanzar                                                           |
| Quien empieza dado · el número de ronda es un entero positivo    | 0, -1, 1,5 (y 2^32) → `InvalidRoundNumber`, sin lanzar; mutación 5.4                               |
| Congelado · misma semilla y asientos, misma partida              | con 2, 3 y 4 jugadores                                                                             |
| Congelado · la referencia produce el setup de referencia         | prueba dorada por identificador; coincide con el prototipo de la exploración; mutaciones 5.2 y 5.5 |

**7.3 —** `PlayerView` no cambió: sigue exponiendo solo `deckCount`, así que no alcanza la carta apartada, la carta de ningún rival ni el orden del mazo que el setup coloca en el estado (la prueba de proyección de `contract.test.ts` sigue en verde). Ninguna operación de preparación es alcanzable desde la superficie de cliente: `startMatch`, `dealRound`, `Seat`, `SetupViolation` y `FullDeck` están en la lista de `boundary.test.ts` (tarea 3.1).

**7.4 — Nota para el issue #9**, que se publica con el PR:

> Nota de alcance: el criterio de éxito «Las 3 descubiertas aparecen en la vista de todos los jugadores; la apartada, en la de ninguno» se cumple en el #10, que tiene ese objetivo y estaba bloqueado por este issue. El PR deja las cartas colocadas en el estado —las descubiertas como información pública y la apartada oculta— y lo prueba; `PlayerView` sigue siendo el marcador del #10.

**Desviaciones registradas:**

- **2.2** — `InvalidRoundNumber` rechaza también los enteros mayores que 2^32 − 1, que `roundRandom` reduciría en silencio.
- **4.8** — se quitó de la prueba una aserción de no nulo que además solo comprobaba `.ok === false`; ahora exige el error exacto.
- **4.5, 4.8 y 4.9** — las cartas se comprueban por identificador de jugador: la mutación 5.5 demostró que compararlas por posición ocultaba una ronda desalineada.
- **6.2** — el índice de ADRs marca el 0007 con su fe de erratas.
- **6.3** — `CLAUDE.md` gana una subsección "Preparación de ronda".

`openspec validate add-round-setup --strict`: **valid**.
