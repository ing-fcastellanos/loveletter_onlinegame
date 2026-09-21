## Why

El Hito 2 pide los ocho efectos de carta. Guardia y Sacerdote son los primeros: el Guardia es la primera carta que elimina a alguien en todo el motor, y el Sacerdote es la prueba de fuego del modelo de eventos con audiencia del ADR 0004 — lo que ve quien lo juega es conocimiento suyo, y de nadie más.

## What Changes

- `eliminate(player)` y `requireActive(round, id)` en `state.ts`: la primera transición de un jugador activo a eliminado en todo el motor, y la búsqueda de un objetivo activo por id — ambas reutilizables por #15–#17 (#17 ya anuncia que reutilizará el mismo camino de eliminación).
- `EFFECTS.Guard` y `EFFECTS.Priest` reemplazan a `noEffect` en `effect.ts`, con la lógica compartida de objetivos legales (activo, no protegido, no uno mismo).
- **BREAKING**: `RuleViolation` gana `MissingTarget`, `IllegalTarget` e `InvalidGuess`.
- **BREAKING**: `GameEvent` gana `GuardGuessed` (público, con `hit: boolean`, nunca revela la carta si falló), `PriestPeeked` (restringido a quien lo jugó — ni el propio objetivo lo ve) y `PlayerEliminated` (público, compartido para #15–#17).

## Non-goals

- Ningún otro efecto de carta (Barón, Sirvienta, Príncipe, Rey, Condesa, Princesa: #15–#17).
- Validación de objetivo o parámetro para ninguna otra carta, ni `legalMoves` (#18).
- Fin de ronda por eliminación (que quede un solo jugador en pie es #19; este cambio solo elimina, no detecta el final).

## Capabilities

### New Capabilities

- `card-effects`: el comportamiento real de cada carta. Este cambio agrega Guardia y Sacerdote; #15–#17 agregan el resto a la misma capacidad.

### Modified Capabilities

_Ninguna: `effect-dispatch`, `game-events` y `game-state` no cambian su forma — este cambio reemplaza dos entradas de una tabla que ya existía y usa tipos (`GameEvent`, `RuleViolation`) que ya estaban diseñados para crecer._

## Impact

- `packages/engine/src/state.ts`: `eliminate`, `requireActive`.
- `packages/engine/src/effect.ts`: `EFFECTS.Guard`, `EFFECTS.Priest`, helper `legalTargets` compartido.
- `packages/engine/src/violation.ts`: tres códigos nuevos.
- `packages/engine/src/event.ts`: tres variantes nuevas.
- `packages/engine/src/command.ts`: su `activeTurnPlayer` se generaliza a `requireActive` en `state.ts` (mismo comportamiento, ahora reutilizable).
- `packages/engine/tests/effect.test.ts` (nuevo): cada violación, cada evento, el descarte sin efecto cuando no hay objetivo legal, la eliminación.
