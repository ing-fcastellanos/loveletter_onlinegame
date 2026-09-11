## 1. Vocabulario

- [ ] 1.1 Formalizar `packages/engine/src/cards.ts`: retirar el encabezado `PROVISIONAL`, conservar `CARD`, `CardName` y `CardValue`, y documentar que el valor es información pública; verificar con `npm run typecheck`.
- [ ] 1.2 Crear `packages/engine/src/result.ts` con `Result<T, E>` como unión `{ ok: true; value } | { ok: false; error }` y los constructores `ok()` y `err()`, sin métodos; verificar con `npm run typecheck`.
- [ ] 1.3 Crear `packages/engine/src/violation.ts` con `RuleViolation` como unión discriminada por `code` —`NotYourTurn` y `CardNotInHand`, cada una con sus datos— y **sin** campo de mensaje; verificar con `npm run typecheck`.

## 2. El modelo

- [ ] 2.1 Reescribir `packages/engine/src/state.ts` con `PlayerId`, `Player`, `Hand`, `ActivePlayer`, `EliminatedPlayer`, `RoundPlayer`, `Turn`, `Round` y `GameState` tal como los fija `design.md`, todos `readonly` a todas las profundidades e imports relativos con extensión `.ts`; verificar con `npm run typecheck`, incluido que `protected` es aceptado como nombre de propiedad.
- [ ] 2.2 Añadir a `packages/engine/src/state.ts` el accesor puro `handOf(round, playerId): Hand | null`; su prueba va en la tarea 5.3.
- [ ] 2.3 Mover `PlayerView` y `project` a `packages/engine/src/view.ts`, adaptando `project` a `state.round.deck` **sin** añadir campos a la vista; verificar con `npm run typecheck`.
- [ ] 2.4 Mover `Command` a `packages/engine/src/command.ts` sin cambiar su forma; verificar con `npm run typecheck`.
- [ ] 2.5 Actualizar los barriles `packages/engine/src/client.ts` y `packages/engine/src/server.ts` según la tabla de superficies de `design.md` —los tipos de ronda, `handOf`, `project`, `ok` y `err` solo en `./server`—; verificar que ninguno de los dos contiene lógica, solo re-exportaciones.

## 3. Consumidores del estado

- [ ] 3.1 Actualizar `services/api/src/main.ts` para construir un `GameState` con la forma nueva; verificar ejecutándolo con `node services/api/src/main.ts`.
- [ ] 3.2 Actualizar `services/api/tests/engine-surface.test.ts` a la forma nueva; verificar con `npm test --workspace services/api`.
- [ ] 3.3 Actualizar `packages/engine/tests/contract.test.ts` a la forma nueva, y ampliar la prueba de proyección para que el estado lleve cartas sostenidas por rivales y una carta robada, exigiendo que **ninguna** aparezca en la vista serializada; verificar con `npm test --workspace packages/engine`.

## 4. Contratos de tipo

- [ ] 4.1 Crear `packages/engine/tests/game-state.types.ts` con el caso positivo: una partida a dos jugadores con tres cartas descubiertas, el turno en fase `play` y un jugador eliminado con descartes compila sin errores; verificar que `tsconfig.test.json` incluye el archivo y `npm run typecheck` pasa.
- [ ] 4.2 Añadir al mismo archivo un `// @ts-expect-error` por cada estado imposible, **una sola construcción por directiva**: carta ajena a los ocho personajes; jugador activo sin carta; jugador activo con dos cartas; carta robada en fase `draw`; eliminado con carta; fichas dentro del estado de ronda; carta o descartes dentro de `Player`; una cantidad de cartas descubiertas distinta de cero y tres; asignar fichas; añadir un descarte; usar `value` sin estrechar por `ok`; y una violación con mensaje de texto. Verificar que `npm run typecheck` pasa (cada directiva encontró su error).
- [ ] 4.3 Ampliar `packages/engine/tests/fixtures/forbidden-import.ts` para intentar alcanzar `Round`, `RoundPlayer`, `Turn` y `handOf` desde la superficie por defecto, y `packages/engine/tests/boundary.test.ts` para exigir `TS2305` y cada nombre en la salida; verificar con `npm test --workspace packages/engine` (Requirement de `engine-package` "La superficie por defecto no expone estado oculto").

## 5. Pruebas de runtime del modelo

- [ ] 5.1 En `packages/engine/tests/model.test.ts`, probar que `CARD` tiene exactamente ocho personajes y que sus valores son del 1 al 8, uno por personaje, en el orden del juego clásico; verificar con `npm test` (Requirement "Los ocho personajes y su valor").
- [ ] 5.2 En el mismo archivo, probar que `ok()` y `err()` producen el discriminante correcto y que el valor solo se lee tras estrechar; verificar con `npm test` (Requirement "Una jugada ilegal se representa como valor").
- [ ] 5.3 En el mismo archivo, probar `handOf`: en fase `play`, dos cartas para el jugador en turno; una para cualquier otro activo; una para el jugador en turno en fase `draw`; `null` para un eliminado y para un id desconocido. Verificar con `npm test` (Requirements "La carta robada existe solo durante la fase de jugar" y "Un jugador eliminado no tiene carta, pero conserva sus descartes").

## 6. Verificación por mutación de los contratos

- [ ] 6.1 Aflojar temporalmente `ActivePlayer.held` para que acepte también dos cartas y confirmar que `npm run typecheck` falla con `TS2578` sobre la directiva correspondiente; revertir.
- [ ] 6.2 Añadir temporalmente `drawn` a la fase `draw` de `Turn` y confirmar que `npm run typecheck` falla con `TS2578`; revertir.
- [ ] 6.3 Añadir temporalmente un campo `message` a una variante de `RuleViolation` y confirmar que `npm run typecheck` falla con `TS2578`; revertir. Con esto queda demostrado que los contratos detectan un modelo aflojado, no solo que hoy compilan.

## 7. Documentación

- [ ] 7.1 Escribir `docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md` con el modelo, la medición de los tres candidatos y la tabla de qué garantiza el tipo y qué no; actualizar `docs/decisions/_index.md` en el mismo paso.
- [ ] 7.2 Actualizar `CLAUDE.md`: añadir una sección breve del modelo de estado en "Dominio"; reescribir en "Cosas que no existen todavía" la línea de los marcadores (el modelo ya existe; las reglas no); y corregir la deriva previa —`@ll/engine` por `@loveletter/engine`, "Node 22+" por "Node 24+"—. Verificar con `grep` que no queda ninguna de las dos formas incorrectas.
- [ ] 7.3 Actualizar `openspec/config.yaml`: corregir `@ll/engine` por `@loveletter/engine` y añadir al contexto las convenciones del modelo (dos capas, carta única del jugador activo, carta robada en el turno); verificar con `grep`.
- [ ] 7.4 Corregir en `README.md` el requisito de Node 22 por Node 24. **No** se edita el ADR 0003, que es inmutable: el requisito actual ya está registrado en el ADR 0005.

## 8. Verificación

- [ ] 8.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [ ] 8.2 Mapear cada escenario de `specs/game-state/spec.md` a su verificación —directiva de `game-state.types.ts`, prueba de `model.test.ts` o prueba de proyección— y anotar la tabla.
- [ ] 8.3 Confirmar que `PlayerView` no expone nada de la información oculta nueva (carta de un rival, carta robada, orden del mazo) citando la prueba de la tarea 3.3.
- [ ] 8.4 Cerrar registrando las desviaciones del plan y `openspec validate model-domain --strict` en verde.
