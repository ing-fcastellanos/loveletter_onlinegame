## Why

El Hito 1 del PDD pide "programar el ciclo básico de turno (robar carta y elegir descarte) permitiendo la iteración entre jugadores, sin aplicar aún los efectos". Hoy el motor sabe construir una partida y proyectarla, pero nada la hace avanzar: `applyCommand` no existe, `Command` es un marcador de un solo brazo, y `RuleViolation` solo tiene dos códigos a la espera de que alguien los use. Cerrar esto cierra el Hito 1 completo — es el único issue abierto de la Fase 1.

## What Changes

- `applyCommand(state, cmd): Result<{ state, events }, RuleViolation>` en `command.ts`, con la forma definitiva del ADR 0004.
- `Command` gana el brazo `Discard` (`Draw` ya existía como marcador): `{ type: 'Discard'; playerId; card: CardName }`. Apunta por valor de carta, no por posición en la mano.
- `RuleViolation` gana tres códigos: `AlreadyDrew`, `MustDrawFirst` (jugador correcto, fase equivocada) y `DeckEmpty` (robar sin cartas).
- `Draw` produce el evento `CardDrawn` (restringido a quien robó); `Discard` produce `CardDiscarded` y `TurnChanged` (ambos públicos) y avanza el turno al siguiente jugador activo, saltando eliminados.
- **BREAKING**: `Command` y `RuleViolation` cambian de forma (nuevos brazos en sus uniones). Cualquier `switch` exhaustivo sobre ellos deja de compilar hasta cubrir los casos nuevos — es el comportamiento buscado (ADR 0006, exhaustividad del compilador).

## Non-goals

- Ningún efecto de carta se resuelve: descartar cualquier carta —incluida la Princesa— es un descarte más, sin eliminar a nadie. Eso es la Fase 2 (issues #13–#17).
- Nadie se elimina en este cambio. La eliminación por Princesa es el #17; por Guardia/Barón, el #14/#15.
- No hay validación de contenido de jugada (Condesa obligatoria, objetivos legales, adivinar "Guardia"): eso es el #18, que también es dueño de `legalMoves`.
- No se detecta fin de ronda (mazo vacío al terminar un turno, o un solo jugador en pie): eso es el #19. Este cambio deja jugar hasta que el mazo se vacía, no después.
- `nextActivePlayer` (o como se llame el avance de turno) asume que, tras un descarte, existe al menos otro jugador activo al que pasarle el turno. Si esa invariante se rompe es porque la ronda ya debió terminar y nadie lo detectó (#19) — no es una jugada ilegal de un cliente, así que no se modela como `RuleViolation`.

## Capabilities

### New Capabilities

- `turn-cycle`: el ciclo de robar, descartar y avanzar el turno, con sus violaciones y sus eventos.

### Modified Capabilities

_Ninguna: `game-events` y `game-state` no cambian su forma — este cambio es el primer productor real de eventos que ya existían, no un cambio de su contrato._

## Impact

- `packages/engine/src/command.ts`: `Command` con el brazo `Discard`, y `applyCommand`.
- `packages/engine/src/violation.ts`: tres códigos nuevos en `RuleViolation`.
- `packages/engine/src/server.ts`: exporta `applyCommand` (autoridad completa, ADR 0004 — `Command` ya se exporta desde ambas superficies).
- Pruebas nuevas en `packages/engine/tests/command.test.ts` (nuevo archivo): cada violación, cada evento, el avance saltando eliminados (con una ronda armada a mano, igual que en #10/#11), inmutabilidad del estado, y una ronda completa jugada por `applyCommand` hasta vaciar el mazo.
