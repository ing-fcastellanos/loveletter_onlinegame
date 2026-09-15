## Why

El [ADR 0004](../../../docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) exige que la interfaz nunca consuma `GameState`, sino una `PlayerView` producida por `project(state, playerId)` dentro del motor. Hoy `project` existe solo como marcador: expone únicamente `deckCount` y no oculta nada más porque no hay nada más que exponer. Sin esta proyección, la Fase 3 no tiene con qué construir la mesa sin leer el estado autoritativo, y el issue #11 (eventos con audiencia) no tiene una vista sobre la cual filtrar.

## What Changes

- `PlayerView` deja de ser `{ deckCount }` y pasa a describir la mesa completa desde el punto de vista de un jugador: número de ronda, mazo restante, cartas descubiertas, el turno (sin la carta robada) y un asiento por jugador en orden de mesa.
- Cada asiento se distingue por `self: true | false` y por `status: 'active' | 'eliminated'`. El asiento propio activo expone la mano completa (`hand: Hand`, vía `handOf`); un asiento rival activo expone `hasCard: boolean` (siempre `true` mientras esté activo, nunca la carta) y si está protegido; un asiento eliminado (propio o rival) solo expone sus descartes.
- La carta apartada (`setAside`) y el orden del mazo no aparecen en ningún campo, bajo ninguna forma.
- `project(state, playerId)` asume que `playerId` corresponde a un jugador sentado en la partida — es una precondición de quien llama, no una entrada que se valide ni se rechace con un `Result`.
- **BREAKING**: el tipo `PlayerView` cambia de forma. El único consumidor actual es la prueba de contrato del propio motor (`contract.test.ts`), que se actualiza en este mismo cambio.

## Non-goals

- No se agrega conocimiento derivado de efectos (lo que un jugador aprendió con el Sacerdote): no hay eventos todavía. `hasCard` queda listo para que el issue #11 lo ensanche a `boolean | CardName`, pero esa ampliación no es parte de este cambio.
- No se toca `applyCommand` ni el ciclo de turno (#12): `turn` en la vista se limita a exponer la fase y quién juega, sin resolver ni validar nada.
- No se agrega una variante de vista de espectador (`playerId` sin asiento). El ADR 0004 la deja como re-evaluación futura.
- No se cambia el modelo de `GameState` ni `Round`: `project` solo lee lo que ya existe.

## Capabilities

### New Capabilities

- `player-view`: proyección del estado autoritativo a lo que un jugador concreto puede ver, con la información oculta ausente del tipo.

### Modified Capabilities

_Ninguna: `game-state` no cambia su forma, solo gana un consumidor de solo lectura._

## Impact

- `packages/engine/src/view.ts`: implementación real de `project` y del tipo `PlayerView` (y de un tipo nuevo, `PlayerSeatView`).
- `packages/engine/src/client.ts` y `server.ts`: sin cambios en qué re-exportan (`PlayerView` ya se exporta desde ambos), pero su forma cambia para quien los consuma.
- `packages/engine/tests/contract.test.ts`: el literal `const view: PlayerView = { deckCount: 10 }` deja de compilar y se reescribe con la forma nueva; el test de fuga de información se rehace comparando campo por campo contra los valores ocultos reales del estado, no con una búsqueda de texto.
- Ningún otro paquete consume `PlayerView` todavía (`apps/web` y `services/api` siguen siendo esqueletos), así que el impacto fuera del motor es nulo.
