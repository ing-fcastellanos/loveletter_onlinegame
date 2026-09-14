## 1. Composición del mazo

- [x] 1.1 Añadir a `packages/engine/src/cards.ts` `DECK_COMPOSITION` (`as const satisfies Record<CardName, number>`) y `DECK`, expandido en el orden de `CARD`; verificar con `npm run typecheck` y ejecutando el fuente con `node` que `satisfies` se borra sin error. **Resultado:** `npm run typecheck` limpio, y Node ejecuta `cards.ts` desde el fuente con `satisfies`: `DECK` tiene 16 cartas con la composición clásica.

## 2. La semilla

- [x] 2.1 Crear `packages/engine/src/random.ts` con `Seed` (tipo marcado), `InvalidSeed` y `toSeed(value): Result<Seed, InvalidSeed>`, que acepta solo enteros seguros no negativos y nunca lanza; verificar con `npm run typecheck`.
- [x] 2.2 Tipar `GameState.seed` como `Seed` en `packages/engine/src/state.ts`, retirando la nota de provisional y citando el ADR 0008; verificar que `npm run typecheck` señala a todos los consumidores que construyen un estado con un número crudo (se corrigen en el grupo 4). **Resultado:** el compilador señaló exactamente cuatro consumidores con `TS2322` —`contract.test.ts`, `game-state.types.ts`, `services/api/src/main.ts` y su prueba—, los que el grupo 4 corrige.

## 3. Generador y barajado

- [x] 3.1 Añadir a `packages/engine/src/random.ts` el generador `sfc32` (interno, 128 bits de estado, 15 salidas descartadas tras sembrar) y `roundRandom(seed, round)`, con los 32 bits bajos de la semilla, sus bits altos, la ronda y una constante en cuatro palabras separadas; verificar con `npm run typecheck` y `npm run lint` (sin `Math.random`). **Nota:** se escribió el sfc32 **canónico** de PractRand a partir de su definición (el contador se suma a la salida antes de incrementarse), sin copiar el esbozo de la exploración. Ver la tarea 6.7.
- [x] 3.2 Añadir `uniformInt(next, n)` interno, por rechazo, sin sesgo de módulo; su corrección se verifica con la uniformidad de la tarea 6.5. **Desviación menor:** `uniformInt` se exporta desde `random.ts` —para que el #9 pueda sortear con él—, pero **no** desde ningún barril: sigue siendo interno al paquete.
- [x] 3.3 Añadir `shuffle(items, next)` genérico con el Fisher-Yates original (sacar del montón con `splice`), sin guardas, aserciones ni `throw`; verificar con `npm run typecheck`.
- [x] 3.4 Añadir `shuffleRound(seed, round)`, que devuelve `{ deck, random }` con el generador ya consumido por el barajado de `DECK`; verificar con `npm run typecheck`.

## 4. Superficies y consumidores

- [x] 4.1 Actualizar los barriles: `packages/engine/src/client.ts` gana `DECK` y `DECK_COMPOSITION`; `packages/engine/src/server.ts` gana además `Seed`, `InvalidSeed`, `toSeed`, `Random`, `roundRandom`, `shuffle` y `shuffleRound`. Verificar que ninguno de los dos contiene lógica. **Resultado:** barriles sin sentencias ejecutables.
- [x] 4.2 Crear `packages/engine/tests/support/seed.ts` con un ayudante que desenvuelve `toSeed` y falla ruidosamente ante un valor inválido; verificar con `npm run typecheck`.
- [x] 4.3 Adaptar `packages/engine/tests/contract.test.ts` (con el ayudante) y `packages/engine/tests/game-state.types.ts` (con `declare const` de una `Seed`) al tipo nuevo; verificar con `npm run typecheck --workspace packages/engine`.
- [x] 4.4 Adaptar `services/api/src/main.ts` y `services/api/tests/engine-surface.test.ts` para obtener su semilla con `toSeed`, desenvolviendo el resultado explícitamente; verificar ejecutando `node services/api/src/main.ts` y con `npm test --workspace services/api`. **Resultado:** `node services/api/src/main.ts` corre y sus 2 pruebas pasan.

## 5. Contratos de tipo y frontera

- [x] 5.1 Crear `packages/engine/tests/deck.types.ts` con el caso positivo (la semilla estrechada de `toSeed` se acepta al barajar) y un `// @ts-expect-error` por construcción prohibida, una sola por directiva: número crudo como `Seed`; `roundRandom` con número crudo; `shuffleRound` con número crudo; `GameState` con semilla cruda. Verificar que `npm run typecheck` pasa (Requirement "Una semilla sin validar no es utilizable"). **Resultado:** `npm run typecheck` limpio: las cuatro directivas encontraron su error.
- [x] 5.2 Ampliar `packages/engine/tests/fixtures/forbidden-import.ts` y la lista de `packages/engine/tests/boundary.test.ts` con `Seed`, `InvalidSeed`, `toSeed`, `Random`, `roundRandom`, `shuffle` y `shuffleRound`; verificar con `npm test --workspace packages/engine` (Requirement "La semilla es información oculta", primer escenario).
- [x] 5.3 En `packages/engine/tests/contract.test.ts`, probar que `DECK` y `DECK_COMPOSITION` se alcanzan desde la superficie de cliente y que la vista proyectada no contiene la semilla; verificar con `npm test --workspace packages/engine` (Requirements "El mazo tiene la composición de la edición clásica", segundo escenario, y "La semilla es información oculta", segundo escenario). **Resultado:** la vista proyectada con la semilla 987654321 no contiene esa cifra.

## 6. Pruebas de runtime del mazo (`packages/engine/tests/deck.test.ts`)

- [x] 6.1 Composición: `DECK` tiene 16 cartas, la cuenta de cada personaje coincide con `DECK_COMPOSITION` y con la edición clásica; verificar con `npm test`.
- [x] 6.2 `toSeed`: acepta 0, 20260911 y `Number.MAX_SAFE_INTEGER`; rechaza como resultado —sin lanzar— -1, 1,5, `NaN`, `Infinity` y 2^53, identificando el valor; verificar con `npm test`.
- [x] 6.3 Determinismo y sensibilidad a toda la semilla: la misma ronda con la misma semilla da el mismo mazo; `s` y `s + 2^32` dan mazos distintos; verificar con `npm test`. **Desviación:** se añadió un segundo par de semillas, 0 y 2^32 + 1. La mutación 7.1b demostró que el par original (s y s + 2^32) no detecta un plegado por XOR de las dos mitades: sus mitades bajas coinciden y se pliegan distinto, y con solo ese par el plegado sobrevivía con la prueba en verde. El par nuevo se pliega igual y lo detecta.
- [x] 6.4 Rondas independientes: muchas rondas consecutivas de una semilla no repiten mazo más de lo que predice el azar, y la carta superior coincide entre rondas consecutivas con la frecuencia esperada (Σ pᵢ² = 44/256) dentro de una tolerancia fija; verificar con `npm test`.
- [x] 6.5 Uniformidad: χ² de la posición de la Princesa sobre un conjunto fijo de semillas por debajo del crítico al 0,1 % (37,70 con 15 g. l.); autoprueba con un barajado ingenuo escrito en la prueba, que debe superar el crítico; y colisiones entre semillas dentro de la cota del cumpleaños. Verificar con `npm test` y que el archivo corre en menos de un segundo. **Resultado:** χ² sobre 16 000 semillas, colisiones sobre 10 000; `deck.test.ts` completo corre en 311 ms. **Desviación:** la autoprueba baraja su propia entrada con la Princesa al final (`PRINCESS_LAST`) en vez de `DECK`. La mutación 7.3 mostró que el sesgo del barajado ingenuo depende de dónde empieza la Princesa —χ² 348,1 al final, 13,8 al principio, por debajo del crítico—, así que con `DECK` la autoprueba solo discriminaba por una casualidad del orden canónico.
- [x] 6.6 Conservación: para un conjunto de semillas, el mazo barajado es una permutación de `DECK`; verificar con `npm test`.
- [x] 6.7 Prueba dorada: la ronda 1 con la semilla 20260911 produce exactamente el mazo registrado en `design.md`, calculado en la exploración con una implementación independiente; si no coincide, **no** se ajusta la prueba: se investiga cuál de las dos implementaciones difiere y se registra aquí. Verificar con `npm test`. **La comprobación cruzada encontró una discrepancia, y se investigó en vez de ajustar la prueba.** El motor produce `Guard Priest Baron Guard Princess Prince Handmaid Priest Prince Guard Guard King Countess Guard Handmaid Baron`, no el mazo registrado en `design.md`. Causa: el esbozo de la exploración incrementaba el contador de sfc32 **antes** de sumarlo a la salida; la definición canónica lo suma antes de incrementarlo. Evidencia: (1) el barajado, el rechazo, el calentamiento y el orden de `DECK` del motor, alimentados con el generador del esbozo, reproducen el mazo del design, así que todo lo demás es idéntico; (2) el esbozo equivale exactamente al sfc32 canónico con el contador + 1 (2000 de 2000 estados); (3) un sfc32 canónico escrito aparte coincide con el del motor en 3000 de 3000 pares de semilla y ronda. La prueba fija la salida canónica, confirmada por esa implementación independiente, y `design.md` quedó corregido con la explicación.
- [x] 6.8 El mazo va primero: `shuffleRound(s, r).deck` es igual a barajar `DECK` con `roundRandom(s, r)`, y sacar valores del `random` devuelto no cambia el mazo que produce otra llamada con la misma semilla y ronda; verificar con `npm test`.

## 7. Verificación por mutación

- [x] 7.1 Plegar temporalmente la semilla a 32 bits en `roundRandom` y confirmar que la prueba de bits altos (6.3) se pone roja; revertir. **Resultado:** truncar la semilla a sus 32 bits bajos pone roja la prueba de bits altos. Se probó además un plegado por XOR (bajos ^ altos): con el par original de 6.3 **sobrevivía**; con el par añadido, se pone roja.
- [x] 7.2 Sesgar temporalmente la selección en `shuffle` (por ejemplo, el mínimo de dos extracciones) y confirmar que la uniformidad (6.5) se pone roja; revertir. **Resultado:** se ponen rojas la uniformidad de la posición de la Princesa, la frecuencia de la carta superior entre rondas y la prueba dorada.
- [x] 7.3 Alterar temporalmente el orden de expansión de `DECK` sin cambiar su composición y confirmar que la prueba dorada (6.7) se pone roja mientras la de composición (6.1) sigue verde; revertir. **Resultado:** roja la prueba dorada y verde la de composición, como se esperaba. **Encontró además un defecto en la tarea 6.5:** la autoprueba de sesgo también se ponía roja, porque dependía del orden de `DECK`. Corregida (ver 6.5) y re-verificada: con `DECK` invertido, solo la dorada se pone roja.
- [x] 7.4 Quitar temporalmente el marcado de `Seed` (que sea `number`) y confirmar que `npm run typecheck` falla con `TS2578` en `deck.types.ts`; revertir. **Resultado:** `TS2578` en las cuatro directivas de `deck.types.ts` (líneas 26, 29, 32 y 35).
- [x] 7.5 Quitar temporalmente un personaje de `DECK_COMPOSITION` y confirmar que `npm run typecheck` falla por `satisfies`; revertir. Las reversiones se hacen desde una copia y se comprueban por sha256. **Resultado:** `TS2741` en `cards.ts` —_Property 'Princess' is missing_— por `satisfies`. Todas las reversiones del grupo se hicieron desde una copia y se comprobaron por sha256.

## 8. Documentación

- [x] 8.1 Escribir `docs/decisions/0008-aleatoriedad-sfc32-semilla-por-ronda.md` con la medición, la decisión (generador, semilla marcada, derivación por ronda, Fisher-Yates original, mazo primero, algoritmo congelado), las alternativas y la re-evaluación —incluido el riesgo de fuerza bruta en la Fase 4—; actualizar `docs/decisions/_index.md`. **Nota:** el ADR no copia el mazo literal: remite a la prueba dorada, de modo que no hubo que tocarlo por la corrección de la tarea 6.7.
- [x] 8.2 Actualizar `CLAUDE.md`: ampliar la invariante "Prohibido `Math.random()`" con el generador, la semilla marcada, la derivación por ronda, la semilla como información oculta y la prueba dorada; y retirar el mazo y el barajado de "Cosas que no existen todavía". Verificar que no queda ninguna afirmación falsa.
- [x] 8.3 Añadir a `openspec/config.yaml` las convenciones de aleatoriedad; verificar con `grep`.

## 9. Verificación

- [x] 9.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [x] 9.2 Mapear cada escenario de `specs/deck/spec.md` a su verificación y anotar la tabla.
- [x] 9.3 Confirmar que ninguna vista de jugador contiene la semilla y que ningún símbolo de semilla o barajado es alcanzable desde la superficie de cliente, citando las tareas 5.2 y 5.3.
- [x] 9.4 Cerrar registrando las desviaciones del plan y `openspec validate add-seeded-deck --strict` en verde.

### Evidencia

**9.1 — Clon limpio** (`git clone -b feat/seeded-deck`), sin pasos intermedios:

```
npm run lint          PASA
npm run format:check  PASA
npm run typecheck     PASA   # incluye los contratos de deck.types.ts y game-state.types.ts
npm run test          PASA
Test Files  4 passed (4)   Tests  30 passed (30)   # packages/engine
Test Files  1 passed (1)   Tests  1 passed (1)   # apps/web
Test Files  1 passed (1)   Tests  2 passed (2)   # services/api
```

**9.2 — Cada escenario de `specs/deck/spec.md` y su verificación** (valores medidos con el código final):

| Requirement · Scenario                                     | Verificado por                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Composición · dieciséis cartas con la distribución clásica | `deck.test.ts` — `DECK` y `DECK_COMPOSITION` contra la composición clásica                             |
| Composición · alcanzable desde la superficie de cliente    | `contract.test.ts` — importa `DECK` y `DECK_COMPOSITION` desde `@loveletter/engine`                    |
| Semilla · un entero seguro no negativo es válido           | `deck.test.ts` — 0, 20260911 y `Number.MAX_SAFE_INTEGER`                                               |
| Semilla · fuera de rango se rechaza como resultado         | `deck.test.ts` — -1, 1,5, `NaN`, `Infinity` y 2^53, sin lanzar                                         |
| Semilla · un número sin validar no se acepta               | `deck.types.ts` — cuatro directivas; mutación 7.4                                                      |
| Determinista · misma semilla y ronda, mismo mazo           | `deck.test.ts`                                                                                         |
| Toda la semilla · por encima de 2^32                       | `deck.test.ts` — dos pares de semillas; mutaciones 7.1 (truncado y plegado por XOR)                    |
| Cada ronda · no repiten mazo más que el azar               | 10 000 de 10 000 rondas distintas                                                                      |
| Cada ronda · rondas consecutivas sin correlación           | carta superior repetida 0,1748; esperado 44/256 ≈ 0,1719; tolerancia 0,02                              |
| Uniforme · posición de la Princesa                         | χ² = 5,95 sobre 16 000 semillas; crítico 37,70; mutación 7.2                                           |
| Uniforme · la prueba detecta un barajado sesgado           | χ² = 348,1 con el barajado ingenuo; robusta al orden de `DECK` (mutación 7.3)                          |
| Uniforme · coincidencias entre semillas                    | 10 000 de 10 000 semillas distintas; esperado ≈ 0,005 colisiones                                       |
| Conserva · permutación del mazo completo                   | `deck.test.ts` — 1000 semillas                                                                         |
| Congelado · semilla de referencia, mazo de referencia      | prueba dorada; mutaciones 7.2 y 7.3; confirmada por un sfc32 canónico escrito aparte (tarea 6.7)       |
| Sorteo posterior · no altera el mazo                       | `deck.test.ts` — el mazo es la primera consumición y 100 sorteos posteriores no lo cambian             |
| Oculta · inalcanzable desde la superficie de cliente       | `boundary.test.ts` — 12 nombres, incluidos `Seed`, `toSeed`, `roundRandom`, `shuffle` y `shuffleRound` |
| Oculta · la vista de un jugador no contiene la semilla     | `contract.test.ts` — la vista proyectada con la semilla 987654321 no contiene esa cifra                |

**9.3 —** Ningún símbolo de semilla o barajado es alcanzable desde la superficie de cliente (tarea 5.2: `TS2305`/`TS2724` por cada nombre) y la vista de un jugador no contiene la semilla (tarea 5.3). `PlayerView` sigue exponiendo solo `deckCount`.

**9.4 — Desviaciones registradas:**

- **6.7** — la prueba dorada no coincidió con el mazo del design. Causa: el esbozo de la exploración incrementaba el contador de sfc32 antes de sumarlo; el motor implementa el sfc32 canónico. Investigado con cuatro comprobaciones independientes y corregido en `design.md`.
- **6.3** — segundo par de semillas, porque el original no detectaba un plegado por XOR (medido: sobrevivía).
- **6.5** — la autoprueba de sesgo usa su propia entrada, porque con `DECK` solo discriminaba por el orden canónico (medido: χ² 13,8 con la Princesa al principio).
- **3.2** — `uniformInt` se exporta desde `random.ts` para el #9, pero no desde ningún barril.

`openspec validate add-seeded-deck --strict`: **valid**.
