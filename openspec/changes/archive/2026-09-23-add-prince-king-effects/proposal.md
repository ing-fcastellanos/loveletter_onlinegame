## Why

El Hito 2 sigue carta por carta: tras Guardia, Sacerdote (issue #14), Barón y Sirvienta (issue #15), faltan el Príncipe y el Rey (issue #16). El Príncipe concentra el caso borde más citado del juego — el auto-objetivo obligatorio cuando todos los rivales están protegidos — y el Rey cierra el grupo de cartas de un solo objetivo.

## What Changes

- `EFFECTS.Prince` deja de ser `noEffect`: el objetivo (que puede ser uno mismo) descarta su carta y roba otra, del mazo o de la carta apartada si el mazo está vacío. Si la carta forzada es la Princesa, el objetivo queda eliminado. Cuando todos los rivales están protegidos, el motor exige explícitamente el auto-objetivo — no lo asume ni lo sugiere.
- Nueva función de legalidad de objetivo propia del Príncipe: a diferencia de Guardia, Sacerdote, Barón y Rey, uno mismo siempre es un objetivo legal, así que nunca se descarta "sin efecto" — siempre hay alguien a quien apuntar.
- `EFFECTS.King` deja de ser `noEffect`: intercambia la carta en mano de quien juega con la de un objetivo legal (mismo camino de objetivo compartido que ya usan Guardia, Sacerdote y Barón). Sin objetivo legal, se descarta sin efecto.
- Ningún evento nuevo: el descarte forzado del Príncipe reutiliza `CardDiscarded`, la carta nueva reutiliza `CardDrawn`, la eliminación reutiliza `PlayerEliminated`; el intercambio del Rey no necesita ningún evento porque cada mano ya se proyecta en vivo por jugador.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `card-effects`: generaliza una vez más el requirement de objetivo legal compartido para incluir al Rey; agrega los requirements propios del Príncipe (auto-objetivo siempre legal y a veces obligatorio, descarte-y-robo, carta apartada, eliminación por Princesa forzada) y del Rey (intercambio de manos, visibilidad).

## Impact

- `packages/engine/src/effect.ts`: `resolvePrince`, `resolveKing`, `legalTargetsForPrince`/`resolvePrinceTarget` propios, entradas nuevas en `EFFECTS`.
- `packages/engine/tests/effect.test.ts`: casos nuevos para Príncipe y Rey.
- `packages/engine/tests/command.test.ts`: el loop de "personaje sin efecto" y el playthrough de punta a punta necesitan excluir también Prince y King o darles parámetros válidos — mismo ajuste que #14 y #15 ya tuvieron que hacer.
- `openspec/specs/card-effects/spec.md`: spec principal extendida al archivar.
