## Why

El Hito 2 avanza carta por carta: tras el Guardia y el Sacerdote (issue #14), faltan el Barón y la Sirvienta (issue #15). El Barón añade la primera eliminación por comparación privada de manos, y la Sirvienta introduce la protección — un concepto de objetivo ilegal que a partir de aquí condiciona a todas las cartas restantes.

## What Changes

- `EFFECTS.Baron` deja de ser `noEffect`: compara la carta de quien juega contra la de un objetivo legal (mismo camino de `legalTargets`/`resolveTarget` que ya usan Guardia y Sacerdote — protegido, uno mismo e inactivo siguen siendo ilegales); el de menor valor queda eliminado con `eliminate()`, y un empate no elimina a nadie.
- Nuevo evento `BaronCompared`, con audiencia restringida a los dos implicados, que lleva ambas cartas. Ningún evento nuevo revela el objetivo a un tercero: solo se entera si hay eliminación, vía el `PlayerEliminated` público que ya existe.
- `EFFECTS.Handmaid` deja de ser `noEffect`: marca a quien la juega como `protected` hasta el inicio de su siguiente turno. No genera ningún evento nuevo — la protección de un rival ya es visible en `PlayerView` en vivo, proyectada directo del estado.
- El ciclo de turno (`applyDiscard`, issue #12) gana un paso nuevo: al calcular quién sigue, limpia su propia protección si la tenía. Es un cambio en el camino compartido de avance de turno, no solo en el efecto de la Sirvienta — aplica a cualquier partida desde ahora.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `card-effects`: agrega los requirements de comportamiento del Barón (comparación privada, empate, elección de eliminación, visibilidad restringida) y de la Sirvienta (activación y expiración de la protección); generaliza el requirement existente de objetivo legal para que cubra también al Barón.

## Impact

- `packages/engine/src/effect.ts`: `resolveBaron`, `resolveHandmaid`, entradas nuevas en `EFFECTS`.
- `packages/engine/src/event.ts`: nuevo miembro `BaronCompared` en `GameEvent`.
- `packages/engine/src/command.ts`: `applyDiscard` limpia la protección del jugador entrante al avanzar el turno.
- `packages/engine/tests/effect.test.ts`: casos nuevos para Barón y Sirvienta.
- `packages/engine/tests/command.test.ts`: los dos tests que #14 ya tuvo que ajustar (el loop de "personaje sin efecto" y el playthrough de punta a punta) necesitan excluir también Baron y Handmaid o darles parámetros válidos.
- `openspec/specs/card-effects/spec.md`: spec principal extendida al archivar.
