## 1. Forma del tipo

- [x] 1.1 Definir `PlayerSeatView` (unión de 4 miembros: `self` × `active`/`eliminated`) en `packages/engine/src/view.ts`, según design.md — Decisiones. Verificar con `npm run typecheck --workspace packages/engine`.
- [x] 1.2 Reemplazar `PlayerView = { deckCount }` por la forma completa (`roundNumber`, `deckCount`, `faceUp`, `players: readonly PlayerSeatView[]`, `turn: { stage, player }`) en `packages/engine/src/view.ts`. Verificar que compila.

## 2. Implementación de `project`

- [x] 2.1 Implementar `project(state, playerId)` en `packages/engine/src/view.ts`: construir cada `PlayerSeatView` combinando el `Player` de partida con el `RoundPlayer` de la ronda, usando `handOf` para la mano propia. Cubre los requirements "El jugador ve su propia mano completa", "Los rivales no revelan su carta" y "Un jugador eliminado solo expone sus descartes" de `specs/player-view/spec.md`, con prueba unitaria por cada caso (propio activo fuera de turno, propio activo en fase de jugar, rival activo, rival protegido, propio eliminado, rival eliminado) en `packages/engine/tests/view.test.ts` (nuevo archivo).
- [x] 2.2 Proyectar `deckCount`, `roundNumber` y `faceUp` copiando de `Round`. Prueba unitaria para "La vista oculta la carta apartada y el orden del mazo" y "Las cartas descubiertas son visibles en toda vista" (con dos, tres y cuatro jugadores) en `view.test.ts`.
- [x] 2.3 Proyectar `turn` como `{ stage, player }`, sin `drawn`. Prueba unitaria para "El turno no revela la carta que se acaba de robar" (caso rival en fase de jugar, y caso propio en fase de jugar) en `view.test.ts`.
- [x] 2.4 Prueba unitaria para "El orden de los asientos es el de la partida": proyectar la misma ronda para cada jugador sentado y comparar el orden de `players` entre las vistas, en `view.test.ts`.

  **Desviación:** `PlayerSeatView` se define `export` en `view.ts` según design.md, pero el proposal no mencionaba re-exportarlo desde los barriles. Sin re-exportarlo, `packages/engine/tests/` no puede nombrarlo (`exports` del `package.json` bloquea el import profundo de `view.ts`). Se agregó a `client.ts` y `server.ts`, igual que `PlayerView`.

## 3. Prueba exhaustiva de fuga de información

- [x] 3.1 Escribir un helper en `view.test.ts` que, dado un `GameState` y una `PlayerView` proyectada de él, verifique la ausencia de fuga: ningún campo prohibido (`setAside`, `deck`, `held`, `drawn`) existe en absoluto en la vista serializada (comprobación por nombre de campo, no por valor), y cada campo que sí puede llevar una carta (`faceUp`, los `discards` de cada asiento, la propia `hand`) coincide exactamente con su fuente en el estado.

  **Desviación de diseño respecto a `design.md`:** un conjunto de "valores prohibidos" comparado por membresía (`forbidden.has(valor)`) da falsos positivos con cartas duplicadas — el mismo nombre de carta puede ser simultáneamente la apartada de un estado y, por una copia distinta, estar legítimamente en un descarte público. Se compara por **nombre de campo** (ningún campo prohibido existe) y por **fidelidad de valor** en los campos que sí son legítimos, no por pertenencia de valor a un conjunto global.

- [x] 3.2 Aplicar el helper sobre varios `GameState` de prueba: 2, 3 y 4 jugadores; turno en fase `draw` y en fase `play`; con y sin jugadores eliminados. Cubre el requirement "Ninguna carta oculta escapa a ninguna vista".

## 4. Actualizar `contract.test.ts`

- [x] 4.1 Reescribir el literal `const view: PlayerView = { deckCount: 10 }` (línea 19) con la forma nueva del tipo.
- [x] 4.2 Reescribir el test "la proyección no deja pasar ninguna carta que el jugador no puede ver" con el mismo criterio de la tarea 3.1 (nombre de campo prohibido + fidelidad de valor), en vez de la búsqueda de texto de cartas. Verificado con `npm test --workspace packages/engine`: 65/65 pruebas en verde.

## 5. Documentación

- [x] 5.1 Actualizar `CLAUDE.md` — sección "Cosas que no existen todavía": `PlayerView` y `project` dejan de listarse como marcadores de los issues #10 y #12; solo `Command` sigue siéndolo (de #12).

## 6. Consumidor no anticipado

- [x] 6.1 `services/api/tests/engine-surface.test.ts` también fija el literal `{ deckCount: 1 }` para `project(...)` y no compilaba con la forma nueva. El proposal decía "ningún otro paquete consume `PlayerView` todavía... el impacto fuera del motor es nulo" — la propia prueba de `services/api` sí lo consumía. Se corrigió con la forma completa esperada, detectado por la verificación en clon limpio (`npm test` en la raíz, no solo `--workspace packages/engine`).

## Verificación

Clon limpio (`git clone --branch feat/player-view` + `npm install`):

- `npm run typecheck` (los tres workspaces): PASS.
- `npm test` (raíz, los tres workspaces): PASS — engine 6 archivos/65 pruebas, web 1, api 2.
- `npm run lint`: PASS.
- `npm run format:check`: PASS.
