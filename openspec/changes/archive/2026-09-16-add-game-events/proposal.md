## Why

El [ADR 0004](../../../docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) resuelve el conocimiento privado (lo que un jugador vio con el Sacerdote) derivándolo de un log de eventos filtrado por audiencia, en vez de mantener una estructura aparte de "quién sabe qué". Hoy ese log no existe: `GameState` no lo tiene, y `project` no tiene nada que filtrar además del propio estado. Sin él, el issue #12 (ciclo de turno) no tiene dónde escribir lo que ocurre, y la Fase 3 no tiene de dónde alimentar animaciones ni un historial de partida.

## What Changes

- Nuevo tipo `GameEvent`: unión discriminada por `type`, con audiencia (`'public'` o una lista de jugadores) en cada variante. Cuatro eventos base: `RoundStarted`, `CardDrawn`, `CardDiscarded`, `TurnChanged`.
- **BREAKING**: `GameState` gana un campo obligatorio nuevo, `log: readonly GameEvent[]`. Todo `GameState` construido a mano dentro del propio motor y de `services/api` deja de compilar hasta agregarle `log`.
- `startMatch` siembra el log de la partida nueva con un `RoundStarted` real de la ronda 1 — el único productor de eventos que ya existe, porque `applyCommand` (issue #12) todavía no.
- **BREAKING**: `PlayerView` gana un campo nuevo, `log: readonly GameEvent[]`, que `project` llena filtrando el log del estado con el mismo criterio de audiencia.
- `CardDiscarded` y `TurnChanged` son siempre públicos. `CardDrawn` es el único con audiencia restringida (quien robó): es redundante con lo que ya ve en su propia mano, pero el log existe para narrar y disparar animaciones, no para informar algo que el estado no supiera ya.

## Non-goals

- No se implementa `applyCommand` ni los comandos de robar/descartar/cambiar turno (issue #12): ningún código de este cambio produce `CardDrawn`, `CardDiscarded` ni `TurnChanged` de verdad todavía. Se prueban con `GameState` y logs armados a mano, igual que se hizo con `PlayerView` en el #10.
- No se agregan eventos de Fase 2 (revelación del Sacerdote, comparación del Barón). El tipo `Audience` ya admite más de un destinatario, pero ningún evento de este cambio lo usa de verdad; se prueba con un evento sintético en las pruebas.
- No se agrega un evento de fin de ronda ni de fin de partida (issues #19 y #20).
- No se cambia `dealRound`: sigue siendo una función pura de reparto, sin parámetro de eventos. Quien construye el `GameState` alrededor de la ronda nueva es quien arma el evento.

## Capabilities

### New Capabilities

- `game-events`: el tipo `GameEvent`, la audiencia, y la regla de filtrado que usa `project`.

### Modified Capabilities

- `game-state`: el estado gana el registro de eventos (requirement nueva, no se modifica ninguna existente).
- `player-view`: la vista gana el registro de eventos filtrado (requirement nueva).
- `round-setup`: `startMatch` registra el evento de que la ronda empezó (requirement nueva).

## Impact

- `packages/engine/src/event.ts` (nuevo): `Audience`, `GameEvent`.
- `packages/engine/src/state.ts`: `GameState.log`.
- `packages/engine/src/setup.ts`: `startMatch` construye el evento `RoundStarted` inicial.
- `packages/engine/src/view.ts`: `PlayerView.log`, filtrado en `project`.
- `packages/engine/src/client.ts` y `server.ts`: `GameEvent`/`Audience` se exportan desde ambos (el filtrado ya vive en `PlayerView`, que es de superficie segura).
- Pruebas que dejan de compilar hasta agregar `log` a sus `GameState` de prueba: `packages/engine/tests/view.test.ts` (el helper `game()`), `packages/engine/tests/contract.test.ts`, `packages/engine/tests/game-state.types.ts`, `packages/engine/tests/deck.types.ts`, `services/api/tests/engine-surface.test.ts`.
