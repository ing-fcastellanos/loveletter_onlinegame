## 1. Vocabulario

- [x] 1.1 Formalizar `packages/engine/src/cards.ts`: retirar el encabezado `PROVISIONAL`, conservar `CARD`, `CardName` y `CardValue`, y documentar que el valor es información pública; verificar con `npm run typecheck`.
- [x] 1.2 Crear `packages/engine/src/result.ts` con `Result<T, E>` como unión `{ ok: true; value } | { ok: false; error }` y los constructores `ok()` y `err()`, sin métodos; verificar con `npm run typecheck`.
- [x] 1.3 Crear `packages/engine/src/violation.ts` con `RuleViolation` como unión discriminada por `code` —`NotYourTurn` y `CardNotInHand`, cada una con sus datos— y **sin** campo de mensaje; verificar con `npm run typecheck`.

## 2. El modelo

- [x] 2.1 Reescribir `packages/engine/src/state.ts` con `PlayerId`, `Player`, `Hand`, `ActivePlayer`, `EliminatedPlayer`, `RoundPlayer`, `Turn`, `Round` y `GameState` tal como los fija `design.md`, todos `readonly` a todas las profundidades e imports relativos con extensión `.ts`; verificar con `npm run typecheck`, incluido que `protected` es aceptado como nombre de propiedad. **Resultado:** lo es; no hizo falta renombrarlo.
- [x] 2.2 Añadir a `packages/engine/src/state.ts` el accesor puro `handOf(round, playerId): Hand | null`; su prueba va en la tarea 5.3.
- [x] 2.3 Mover `PlayerView` y `project` a `packages/engine/src/view.ts`, adaptando `project` a `state.round.deck` **sin** añadir campos a la vista; verificar con `npm run typecheck`.
- [x] 2.4 Mover `Command` a `packages/engine/src/command.ts` sin cambiar su forma; verificar con `npm run typecheck`.
- [x] 2.5 Actualizar los barriles `packages/engine/src/client.ts` y `packages/engine/src/server.ts` según la tabla de superficies de `design.md` —los tipos de ronda, `handOf`, `project`, `ok` y `err` solo en `./server`—; verificar que ninguno de los dos contiene lógica, solo re-exportaciones.

## 3. Consumidores del estado

- [x] 3.1 Actualizar `services/api/src/main.ts` para construir un `GameState` con la forma nueva; verificar ejecutándolo con `node services/api/src/main.ts`.
- [x] 3.2 Actualizar `services/api/tests/engine-surface.test.ts` a la forma nueva; verificar con `npm test --workspace services/api`.
- [x] 3.3 Actualizar `packages/engine/tests/contract.test.ts` a la forma nueva, y ampliar la prueba de proyección para que el estado lleve cartas sostenidas por rivales y una carta robada, exigiendo que **ninguna** aparezca en la vista serializada; verificar con `npm test --workspace packages/engine`. **Nota:** la carta robada del caso es de un rival (turno de Beto, proyección para Ana), y la carta propia de Ana no se lista como oculta: cuando el #10 le muestre su mano, la prueba seguirá siendo correcta.

## 4. Contratos de tipo

- [x] 4.1 Crear `packages/engine/tests/game-state.types.ts` con el caso positivo: una partida a dos jugadores con tres cartas descubiertas, el turno en fase `play` y un jugador eliminado con descartes compila sin errores; verificar que `tsconfig.test.json` incluye el archivo y `npm run typecheck` pasa. **Desviación:** son dos casos positivos, no uno. Un eliminado en una ronda a dos significa que la ronda ya terminó, así que el caso combinado describía un estado que el juego no admite aunque el tipo lo acepte. Quedaron _partida a dos_ (tres descubiertas, turno en `play`) y _ronda a tres_ (sin descubiertas, con un eliminado que conserva sus descartes).
- [x] 4.2 Añadir al mismo archivo un `// @ts-expect-error` por cada estado imposible, **una sola construcción por directiva**: carta ajena a los ocho personajes; jugador activo sin carta; jugador activo con dos cartas; carta robada en fase `draw`; eliminado con carta; fichas dentro del estado de ronda; carta o descartes dentro de `Player`; una cantidad de cartas descubiertas distinta de cero y tres; asignar fichas; añadir un descarte; usar `value` sin estrechar por `ok`; y una violación con mensaje de texto. Verificar que `npm run typecheck` pasa (cada directiva encontró su error).
- [x] 4.3 Ampliar `packages/engine/tests/fixtures/forbidden-import.ts` para intentar alcanzar `Round`, `RoundPlayer`, `Turn` y `handOf` desde la superficie por defecto, y `packages/engine/tests/boundary.test.ts` para exigir `TS2305` y cada nombre en la salida; verificar con `npm test --workspace packages/engine` (Requirement de `engine-package` "La superficie por defecto no expone estado oculto"). **Desviación:** `handOf` no produce `TS2305` sino **`TS2724`** —_Did you mean 'Hand'?_—, porque ahora existe `Hand` en la superficie y el compilador sugiere el nombre parecido. Se vio en la salida real antes de escribir la aserción, que acepta ambos códigos y exige cada nombre por separado.

## 5. Pruebas de runtime del modelo

- [x] 5.1 En `packages/engine/tests/model.test.ts`, probar que `CARD` tiene exactamente ocho personajes y que sus valores son del 1 al 8, uno por personaje, en el orden del juego clásico; verificar con `npm test` (Requirement "Los ocho personajes y su valor").
- [x] 5.2 En el mismo archivo, probar que `ok()` y `err()` producen el discriminante correcto y que el valor solo se lee tras estrechar; verificar con `npm test` (Requirement "Una jugada ilegal se representa como valor").
- [x] 5.3 En el mismo archivo, probar `handOf`: en fase `play`, dos cartas para el jugador en turno; una para cualquier otro activo; una para el jugador en turno en fase `draw`; `null` para un eliminado y para un id desconocido. Verificar con `npm test` (Requirements "La carta robada existe solo durante la fase de jugar" y "Un jugador eliminado no tiene carta, pero conserva sus descartes").

## 6. Verificación por mutación de los contratos

- [x] 6.1 Aflojar temporalmente `ActivePlayer.held` para que acepte también dos cartas y confirmar que `npm run typecheck` falla con `TS2578` sobre la directiva correspondiente; revertir. **Resultado:** `game-state.types.ts(76,1): error TS2578` —la directiva de _un jugador activo con dos cartas_—.
- [x] 6.2 Añadir temporalmente `drawn` a la fase `draw` de `Turn` y confirmar que `npm run typecheck` falla con `TS2578`; revertir. **Resultado:** `TS2578` en la línea 79, la de _una carta robada antes de robar_.
- [x] 6.3 Añadir temporalmente un campo `message` a una variante de `RuleViolation` y confirmar que `npm run typecheck` falla con `TS2578`; revertir. Con esto queda demostrado que los contratos detectan un modelo aflojado, no solo que hoy compilan. **Resultado:** `TS2578` en la línea 109, la de _una violación con mensaje de texto_. La reversión se hizo desde una copia en el scratchpad —no con `git checkout`, que habría restaurado los marcadores de la Fase 0— y se comprobó por sha256 que `state.ts` y `violation.ts` quedaron idénticos.

## 7. Documentación

- [x] 7.1 Escribir `docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md` con el modelo, la medición de los tres candidatos y la tabla de qué garantiza el tipo y qué no; actualizar `docs/decisions/_index.md` en el mismo paso.
- [x] 7.2 Actualizar `CLAUDE.md`: añadir una sección breve del modelo de estado en "Dominio"; reescribir en "Cosas que no existen todavía" la línea de los marcadores (el modelo ya existe; las reglas no); y corregir la deriva previa —`@ll/engine` por `@loveletter/engine`, "Node 22+" por "Node 24+"—. Verificar con `grep` que no queda ninguna de las dos formas incorrectas.
- [x] 7.3 Actualizar `openspec/config.yaml`: corregir `@ll/engine` por `@loveletter/engine` y añadir al contexto las convenciones del modelo (dos capas, carta única del jugador activo, carta robada en el turno); verificar con `grep`.
- [x] 7.4 Corregir en `README.md` el requisito de Node 22 por Node 24. **No** se edita el ADR 0003, que es inmutable: el requisito actual ya está registrado en el ADR 0005. **Añadido:** también se actualizó el párrafo "Estado" del README, que seguía diciendo que la Fase 0 estaba en curso.

## 8. Verificación

- [x] 8.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [x] 8.2 Mapear cada escenario de `specs/game-state/spec.md` a su verificación —directiva de `game-state.types.ts`, prueba de `model.test.ts` o prueba de proyección— y anotar la tabla.
- [x] 8.3 Confirmar que `PlayerView` no expone nada de la información oculta nueva (carta de un rival, carta robada, orden del mazo) citando la prueba de la tarea 3.3.
- [x] 8.4 Cerrar registrando las desviaciones del plan y `openspec validate model-domain --strict` en verde.

### Evidencia

**8.1 — Clon limpio** (`git clone -b feat/model-domain`), sin pasos intermedios:

```
npm run lint          PASA
npm run format:check  PASA
npm run typecheck     PASA   # incluye los 13 contratos de game-state.types.ts
npm run test          PASA
Test Files  3 passed (3)   Tests  15 passed (15)   # packages/engine
Test Files  1 passed (1)   Tests  1 passed (1)   # apps/web
Test Files  1 passed (1)   Tests  2 passed (2)   # services/api
```

**8.2 — Cada escenario de `specs/game-state/spec.md` y su verificación:**

| Requirement · Scenario                                         | Verificado por                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Ocho personajes · valores del juego clásico                    | `model.test.ts` — `Object.entries(CARD)` exacto, del 1 al 8 en orden                              |
| Ocho personajes · carta ajena no representable                 | `game-state.types.ts` — `c1: CardName = 'Joker'`                                                  |
| Una carta · activo sin carta                                   | `game-state.types.ts` — `p0`                                                                      |
| Una carta · dos cartas, tenga o no el turno                    | `game-state.types.ts` — `p2`; mutación 6.1                                                        |
| Carta robada · antes de robar no hay                           | `game-state.types.ts` — `t1`; mutación 6.2                                                        |
| Carta robada · tras robar, dos cartas para el jugador en turno | `model.test.ts` — `handOf` en `play` devuelve `['Guard', 'Countess']`                             |
| Carta robada · los demás siguen con una                        | `model.test.ts` — `handOf` de Beto devuelve `['Baron']`                                           |
| Eliminado · con carta no representable                         | `game-state.types.ts` — `e1`                                                                      |
| Eliminado · no tiene mano                                      | `model.test.ts` — `handOf` de Caro devuelve `null`                                                |
| Eliminado · conserva sus descartes                             | `model.test.ts` — los descartes de Caro siguen en la ronda                                        |
| Fichas · no viven en la ronda                                  | `game-state.types.ts` — `RoundPlayer['tokens']`                                                   |
| Fichas · la partida no lleva carta ni descartes                | `game-state.types.ts` — `Player['held']`, `Player['discards']`                                    |
| Descubiertas · tres                                            | `game-state.types.ts` — `partidaADos` compila                                                     |
| Descubiertas · ninguna                                         | `game-state.types.ts` — `rondaATres` compila                                                      |
| Descubiertas · otra cantidad                                   | `game-state.types.ts` — `f2` con dos cartas                                                       |
| Inmutable · asignar un campo                                   | `game-state.types.ts` — `player.tokens = 3`                                                       |
| Inmutable · modificar una colección                            | `game-state.types.ts` — `discards.push(...)`                                                      |
| Valor · no se lee sin distinguir el éxito                      | `game-state.types.ts` — `result.value` sin estrechar; `model.test.ts` lo lee tras `ok`            |
| Valor · código y datos, sin texto                              | `game-state.types.ts` — `v1` con `message`; mutación 6.3; `model.test.ts` — forma exacta de `err` |

**8.3 — `PlayerView` no expone la información oculta nueva.** `contract.test.ts` construye un turno de Beto en fase `play` con la Condesa robada y proyecta para Ana: en la vista serializada no aparece la carta robada de Beto (Condesa), ni la carta de ningún rival (Rey, Sirvienta), ni el mazo (Guardia, Sacerdote), ni la carta apartada (Princesa).

**8.4 — Desviaciones registradas:** tarea 4.1 (dos casos positivos en vez de uno, porque el combinado describía un estado que el juego no admite), 4.3 (`handOf` produce `TS2724`, no `TS2305`) y 7.4 (también se actualizó el párrafo de estado del README). Sin desviación en 2.1 (`protected` es válido como nombre de propiedad).
