## 1. Tipo del evento

- [x] 1.1 Crear `packages/engine/src/event.ts` con `Audience = 'public' | readonly PlayerId[]` y `GameEvent` (unión discriminada por `type`: `RoundStarted`, `CardDrawn`, `CardDiscarded`, `TurnChanged`), según design.md — Decisiones. Verificar con `npm run typecheck --workspace packages/engine`.

## 2. `GameState` lleva el registro

- [x] 2.1 Agregar `log: readonly GameEvent[]` a `GameState` en `state.ts`. Cubre el requirement "El estado lleva un registro de eventos que crece con la partida" de `specs/game-state/spec.md`, con prueba unitaria de que el registro sobrevive al reparto de una ronda nueva (`dealRound` no lo toca; quien construye el `GameState` siguiente decide qué le agrega). Prueba en `model.test.ts`.
- [x] 2.2 Exportar `GameEvent` y `Audience` desde `client.ts` y `server.ts` (superficie segura y de autoridad, como `PlayerView`).

## 3. `startMatch` siembra el primer evento

- [x] 3.1 `startMatch` construye el `GameState` con `log: [RoundStarted]` (ronda 1, quien empieza). `dealRound` no cambia de firma. Cubre el requirement "Iniciar una partida registra el evento de que la ronda empezó" de `specs/round-setup/spec.md`, con prueba unitaria en `packages/engine/tests/setup.test.ts`.

## 4. `PlayerView` filtra el registro

- [x] 4.1 Agregar `log: readonly GameEvent[]` a `PlayerView` y filtrarlo en `project`: público, o `audience.includes(playerId)`. Cubre los tres requirements de `specs/game-events/spec.md` (audiencia declarada, robo restringido, descarte/turno públicos) y los tres de `specs/player-view/spec.md` (públicos visibles, restringido visible para su audiencia, restringido invisible para terceros — ni como entrada anónima), con prueba unitaria por caso en `packages/engine/tests/view.test.ts`, incluido un evento sintético de audiencia `['ana', 'beto']` para el caso general de dos destinatarios (design.md — Sin comando real...).

## 5. Actualizar fixtures existentes

- [x] 5.1 Agregar `log: []` (o el valor que corresponda) a cada `GameState` armado a mano que deja de compilar: `packages/engine/tests/view.test.ts` (helper `game()`), `packages/engine/tests/contract.test.ts`, `packages/engine/tests/game-state.types.ts`, `services/api/tests/engine-surface.test.ts`. Verificado `npm run typecheck` y `npm test` en la raíz: engine 73/73, web 1/1, api 2/2.

  **Desviaciones:** `packages/engine/tests/deck.types.ts` no necesitó cambio — `estado` ahí es un `declare const estado: GameState` (nunca se construye un valor real), así que el tipo ampliado no le pide nada. **No anticipado:** `services/api/src/main.ts` (el esqueleto de servidor de la Fase 0, no listado en proposal.md — Impact) también construye un `GameState` a mano y dejó de compilar; se le agregó `log` con un `RoundStarted` de ejemplo, igual que al resto.

## 6. Documentación

- [x] 6.1 Actualizar `CLAUDE.md` — sección "Cosas que no existen todavía": el registro de eventos con audiencia ya existe (issue #11); `Command`/`applyCommand` siguen siendo el marcador del issue #12.

## Verificación

<!-- Completar al implementar: salida de npm test, npm run typecheck, npm run lint y npm run format:check en un clon limpio. -->
