## 1. El mazo de la ronda con tipo de tupla

- [ ] 1.1 Añadir a `packages/engine/src/cards.ts` el tipo `FullDeck`, una tupla de dieciséis `CardName`; verificar con `npm run typecheck`.
- [ ] 1.2 Afinar en `packages/engine/src/random.ts` el tipo de `shuffleRound` a `{ deck: FullDeck; random: Random }` con una sola aserción `as FullDeck`, comentada con el requisito de `deck` que la respalda; verificar con `npm run typecheck` y que `npm test` sigue verde, incluida la prueba dorada del #8 (sin cambio en runtime).

## 2. El setup (`packages/engine/src/setup.ts`)

- [ ] 2.1 Crear `packages/engine/src/setup.ts` con `Seat`, `SetupViolation` (las cuatro variantes de `design.md`), `Seating<T>` y la guarda `isSeating`, que comprueba la longitud en runtime sin aserciones; verificar con `npm run typecheck`.
- [ ] 2.2 Implementar la validación en el orden fijado por `design.md` —número de jugadores, primer identificador repetido en orden de asiento, número de ronda, quien empieza—, devolviendo `Result` y sin lanzar; su comportamiento se prueba en las tareas 4.1, 4.2 y 4.8.
- [ ] 2.3 Implementar `dealRound(seed, number, players, first)` con una rama por número de jugadores que desestructura el mazo de `shuffleRound` y los asientos: apartada, descubiertas solo a dos, una carta por asiento en orden de asiento, mazo restante y `turn = { stage: 'draw', player: first }`. Verificar con `npm run typecheck` y con `grep` que el módulo no contiene `throw`, `!` como aserción de no nulo ni `as` salvo `as const`.
- [ ] 2.4 Implementar `startMatch(seed, seats)`: jugadores con fichas en cero, sorteo de quién empieza con `uniformInt` sobre el generador que devuelve `shuffleRound(seed, 1)` —elegido con un `reduce` sin indexar— y reparto con `dealRound(seed, 1, …)`; verificar con `npm run typecheck`.
- [ ] 2.5 Publicar en `packages/engine/src/server.ts` `Seat`, `SetupViolation`, `FullDeck`, `startMatch` y `dealRound`; `packages/engine/src/client.ts` no cambia. Verificar que los barriles no contienen lógica.

## 3. Frontera

- [ ] 3.1 Ampliar `packages/engine/tests/fixtures/forbidden-import.ts` y la lista de `packages/engine/tests/boundary.test.ts` con `startMatch`, `dealRound`, `Seat`, `SetupViolation` y `FullDeck`; verificar con `npm test --workspace packages/engine`.

## 4. Pruebas de runtime (`packages/engine/tests/setup.test.ts`)

- [ ] 4.1 Número de jugadores: 2, 3 y 4 construyen partida; 0, 1 y 5 se rechazan con `InvalidPlayerCount` y la cantidad, sin lanzar; verificar con `npm test`.
- [ ] 4.2 Identificadores únicos: un identificador repetido se rechaza con `DuplicatePlayerId` identificando el primero repetido en orden de asiento, sin lanzar; verificar con `npm test`.
- [ ] 4.3 Partida desde cero: fichas en cero, ronda 1, y jugadores de ronda con los mismos identificadores y en el mismo orden que los de la partida, todos activos, sin descartes y sin protección; verificar con `npm test`.
- [ ] 4.4 Cartas fuera de juego: la apartada es la primera carta de `shuffleRound(seed, 1).deck` con 2, 3 y 4 jugadores; con 2, las descubiertas son la segunda, tercera y cuarta; con 3 y 4 no hay; verificar con `npm test`.
- [ ] 4.5 Reparto por asiento: cada asiento sostiene la carta que le corresponde en orden de asiento, y repartir con `dealRound` indicando a cada jugador como quien empieza deja las mismas cartas en cada asiento; verificar con `npm test`.
- [ ] 4.6 Mazo restante: 10, 12 y 11 cartas con 2, 3 y 4 jugadores; y para un conjunto de semillas, apartada + descubiertas + cartas de los jugadores + mazo restante es exactamente la composición del mazo; verificar con `npm test`.
- [ ] 4.7 Sorteo de quién empieza: el turno está en `draw` y pertenece a un jugador sentado; el reparto coincide con el mazo barajado de la ronda 1; y χ² de quién empieza sobre un conjunto fijo de semillas por debajo del crítico al 0,1 % (1, 2 y 3 g. l.: 10,828 / 13,816 / 16,266) para 2, 3 y 4 jugadores; verificar con `npm test`.
- [ ] 4.8 `dealRound` con quien empieza dado: el turno pertenece a quien se indica; con número de ronda `n` el reparto sale de `shuffleRound(seed, n)` y la ronda lleva ese número; se rechazan, sin lanzar, quien empieza no sentado (`UnknownFirstPlayer`), números de ronda 0, -1 y 1,5 (`InvalidRoundNumber`) y jugadores inválidos; verificar con `npm test`.
- [ ] 4.9 Determinismo y prueba dorada: la misma semilla y los mismos asientos producen partidas idénticas; la semilla 20260911 con `ana` y `beto` produce exactamente el setup de referencia de `design.md`. Si no coincide, **no** se ajusta la prueba: se investiga si difiere la implementación o el prototipo, y se registra aquí. Verificar con `npm test`.

## 5. Verificación por mutación

- [ ] 5.1 Descubrir temporalmente tres cartas también con tres jugadores y confirmar que la prueba de cartas fuera de juego (4.4) y la de mazo restante (4.6) se ponen rojas; revertir.
- [ ] 5.2 Repartir temporalmente en orden inverso de asiento y confirmar que la prueba de reparto por asiento (4.5) y la dorada (4.9) se ponen rojas; revertir.
- [ ] 5.3 Quitar temporalmente el sorteo (empieza siempre el primer asiento) y confirmar que la uniformidad de quién empieza (4.7) se pone roja; revertir.
- [ ] 5.4 Quitar temporalmente la validación del número de ronda y confirmar que la prueba de números de ronda inválidos (4.8) se pone roja; revertir.
- [ ] 5.5 Construir temporalmente los jugadores de ronda en orden inverso y confirmar que la prueba de alineación (4.3) se pone roja; revertir. Todas las reversiones se hacen desde una copia y se comprueban por sha256.

## 6. Documentación

- [ ] 6.1 Escribir `docs/decisions/0009-preparacion-de-ronda-reparto-y-sorteo.md` con la medición, el orden canónico del reparto, el sorteo tras el barajado, la validación en el constructor (y por qué no en el tipo), el afinado `FullDeck` y la re-evaluación; actualizar `docs/decisions/_index.md`.
- [ ] 6.2 Corregir en `docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md` las cuatro referencias a issues equivocadas (#20/#21 → #19/#20; #22 → #21), añadir al final una sección "Fe de erratas" fechada que diga qué se corrigió y que la decisión no cambia, y corregir el comentario equivalente de `packages/engine/src/state.ts`; verificar con `grep` que no queda ninguna referencia equivocada.
- [ ] 6.3 Actualizar `CLAUDE.md` (el setup en la sección del modelo y "Cosas que no existen todavía") y `openspec/config.yaml` (convenciones del setup); verificar que no queda ninguna afirmación falsa.

## 7. Verificación

- [ ] 7.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [ ] 7.2 Mapear cada escenario de `specs/round-setup/spec.md` a su verificación y anotar la tabla.
- [ ] 7.3 Confirmar que `PlayerView` no expone nada de la información oculta que el setup coloca (carta apartada, cartas ajenas, orden del mazo) y que ninguna operación de setup es alcanzable desde la superficie de cliente, citando las tareas 3.1 y la prueba de proyección existente.
- [ ] 7.4 Redactar aquí la nota que se publicará con el PR, en el issue #9: la parte de su criterio sobre las vistas se cumple en el #10. Cerrar registrando las desviaciones del plan y `openspec validate add-round-setup --strict` en verde.
