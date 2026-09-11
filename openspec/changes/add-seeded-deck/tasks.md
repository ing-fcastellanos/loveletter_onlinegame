## 1. Composición del mazo

- [ ] 1.1 Añadir a `packages/engine/src/cards.ts` `DECK_COMPOSITION` (`as const satisfies Record<CardName, number>`) y `DECK`, expandido en el orden de `CARD`; verificar con `npm run typecheck` y ejecutando el fuente con `node` que `satisfies` se borra sin error.

## 2. La semilla

- [ ] 2.1 Crear `packages/engine/src/random.ts` con `Seed` (tipo marcado), `InvalidSeed` y `toSeed(value): Result<Seed, InvalidSeed>`, que acepta solo enteros seguros no negativos y nunca lanza; verificar con `npm run typecheck`.
- [ ] 2.2 Tipar `GameState.seed` como `Seed` en `packages/engine/src/state.ts`, retirando la nota de provisional y citando el ADR 0008; verificar que `npm run typecheck` señala a todos los consumidores que construyen un estado con un número crudo (se corrigen en el grupo 4).

## 3. Generador y barajado

- [ ] 3.1 Añadir a `packages/engine/src/random.ts` el generador `sfc32` (interno, 128 bits de estado, 15 salidas descartadas tras sembrar) y `roundRandom(seed, round)`, con los 32 bits bajos de la semilla, sus bits altos, la ronda y una constante en cuatro palabras separadas; verificar con `npm run typecheck` y `npm run lint` (sin `Math.random`).
- [ ] 3.2 Añadir `uniformInt(next, n)` interno, por rechazo, sin sesgo de módulo; su corrección se verifica con la uniformidad de la tarea 6.5.
- [ ] 3.3 Añadir `shuffle(items, next)` genérico con el Fisher-Yates original (sacar del montón con `splice`), sin guardas, aserciones ni `throw`; verificar con `npm run typecheck`.
- [ ] 3.4 Añadir `shuffleRound(seed, round)`, que devuelve `{ deck, random }` con el generador ya consumido por el barajado de `DECK`; verificar con `npm run typecheck`.

## 4. Superficies y consumidores

- [ ] 4.1 Actualizar los barriles: `packages/engine/src/client.ts` gana `DECK` y `DECK_COMPOSITION`; `packages/engine/src/server.ts` gana además `Seed`, `InvalidSeed`, `toSeed`, `Random`, `roundRandom`, `shuffle` y `shuffleRound`. Verificar que ninguno de los dos contiene lógica.
- [ ] 4.2 Crear `packages/engine/tests/support/seed.ts` con un ayudante que desenvuelve `toSeed` y falla ruidosamente ante un valor inválido; verificar con `npm run typecheck`.
- [ ] 4.3 Adaptar `packages/engine/tests/contract.test.ts` (con el ayudante) y `packages/engine/tests/game-state.types.ts` (con `declare const` de una `Seed`) al tipo nuevo; verificar con `npm run typecheck --workspace packages/engine`.
- [ ] 4.4 Adaptar `services/api/src/main.ts` y `services/api/tests/engine-surface.test.ts` para obtener su semilla con `toSeed`, desenvolviendo el resultado explícitamente; verificar ejecutando `node services/api/src/main.ts` y con `npm test --workspace services/api`.

## 5. Contratos de tipo y frontera

- [ ] 5.1 Crear `packages/engine/tests/deck.types.ts` con el caso positivo (la semilla estrechada de `toSeed` se acepta al barajar) y un `// @ts-expect-error` por construcción prohibida, una sola por directiva: número crudo como `Seed`; `roundRandom` con número crudo; `shuffleRound` con número crudo; `GameState` con semilla cruda. Verificar que `npm run typecheck` pasa (Requirement "Una semilla sin validar no es utilizable").
- [ ] 5.2 Ampliar `packages/engine/tests/fixtures/forbidden-import.ts` y la lista de `packages/engine/tests/boundary.test.ts` con `Seed`, `InvalidSeed`, `toSeed`, `Random`, `roundRandom`, `shuffle` y `shuffleRound`; verificar con `npm test --workspace packages/engine` (Requirement "La semilla es información oculta", primer escenario).
- [ ] 5.3 En `packages/engine/tests/contract.test.ts`, probar que `DECK` y `DECK_COMPOSITION` se alcanzan desde la superficie de cliente y que la vista proyectada no contiene la semilla; verificar con `npm test --workspace packages/engine` (Requirements "El mazo tiene la composición de la edición clásica", segundo escenario, y "La semilla es información oculta", segundo escenario).

## 6. Pruebas de runtime del mazo (`packages/engine/tests/deck.test.ts`)

- [ ] 6.1 Composición: `DECK` tiene 16 cartas, la cuenta de cada personaje coincide con `DECK_COMPOSITION` y con la edición clásica; verificar con `npm test`.
- [ ] 6.2 `toSeed`: acepta 0, 20260911 y `Number.MAX_SAFE_INTEGER`; rechaza como resultado —sin lanzar— -1, 1,5, `NaN`, `Infinity` y 2^53, identificando el valor; verificar con `npm test`.
- [ ] 6.3 Determinismo y sensibilidad a toda la semilla: la misma ronda con la misma semilla da el mismo mazo; `s` y `s + 2^32` dan mazos distintos; verificar con `npm test`.
- [ ] 6.4 Rondas independientes: muchas rondas consecutivas de una semilla no repiten mazo más de lo que predice el azar, y la carta superior coincide entre rondas consecutivas con la frecuencia esperada (Σ pᵢ² = 44/256) dentro de una tolerancia fija; verificar con `npm test`.
- [ ] 6.5 Uniformidad: χ² de la posición de la Princesa sobre un conjunto fijo de semillas por debajo del crítico al 0,1 % (37,70 con 15 g. l.); autoprueba con un barajado ingenuo escrito en la prueba, que debe superar el crítico; y colisiones entre semillas dentro de la cota del cumpleaños. Verificar con `npm test` y que el archivo corre en menos de un segundo.
- [ ] 6.6 Conservación: para un conjunto de semillas, el mazo barajado es una permutación de `DECK`; verificar con `npm test`.
- [ ] 6.7 Prueba dorada: la ronda 1 con la semilla 20260911 produce exactamente el mazo registrado en `design.md`, calculado en la exploración con una implementación independiente; si no coincide, **no** se ajusta la prueba: se investiga cuál de las dos implementaciones difiere y se registra aquí. Verificar con `npm test`.
- [ ] 6.8 El mazo va primero: `shuffleRound(s, r).deck` es igual a barajar `DECK` con `roundRandom(s, r)`, y sacar valores del `random` devuelto no cambia el mazo que produce otra llamada con la misma semilla y ronda; verificar con `npm test`.

## 7. Verificación por mutación

- [ ] 7.1 Plegar temporalmente la semilla a 32 bits en `roundRandom` y confirmar que la prueba de bits altos (6.3) se pone roja; revertir.
- [ ] 7.2 Sesgar temporalmente la selección en `shuffle` (por ejemplo, el mínimo de dos extracciones) y confirmar que la uniformidad (6.5) se pone roja; revertir.
- [ ] 7.3 Alterar temporalmente el orden de expansión de `DECK` sin cambiar su composición y confirmar que la prueba dorada (6.7) se pone roja mientras la de composición (6.1) sigue verde; revertir.
- [ ] 7.4 Quitar temporalmente el marcado de `Seed` (que sea `number`) y confirmar que `npm run typecheck` falla con `TS2578` en `deck.types.ts`; revertir.
- [ ] 7.5 Quitar temporalmente un personaje de `DECK_COMPOSITION` y confirmar que `npm run typecheck` falla por `satisfies`; revertir. Las reversiones se hacen desde una copia y se comprueban por sha256.

## 8. Documentación

- [ ] 8.1 Escribir `docs/decisions/0008-aleatoriedad-sfc32-semilla-por-ronda.md` con la medición, la decisión (generador, semilla marcada, derivación por ronda, Fisher-Yates original, mazo primero, algoritmo congelado), las alternativas y la re-evaluación —incluido el riesgo de fuerza bruta en la Fase 4—; actualizar `docs/decisions/_index.md`.
- [ ] 8.2 Actualizar `CLAUDE.md`: ampliar la invariante "Prohibido `Math.random()`" con el generador, la semilla marcada, la derivación por ronda, la semilla como información oculta y la prueba dorada; y retirar el mazo y el barajado de "Cosas que no existen todavía". Verificar que no queda ninguna afirmación falsa.
- [ ] 8.3 Añadir a `openspec/config.yaml` las convenciones de aleatoriedad; verificar con `grep`.

## 9. Verificación

- [ ] 9.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [ ] 9.2 Mapear cada escenario de `specs/deck/spec.md` a su verificación y anotar la tabla.
- [ ] 9.3 Confirmar que ninguna vista de jugador contiene la semilla y que ningún símbolo de semilla o barajado es alcanzable desde la superficie de cliente, citando las tareas 5.2 y 5.3.
- [ ] 9.4 Cerrar registrando las desviaciones del plan y `openspec validate add-seeded-deck --strict` en verde.
