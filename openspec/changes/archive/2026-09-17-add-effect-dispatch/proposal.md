## Why

El Hito 2 del PDD pide ocho efectos de carta. Antes de escribirlos conviene fijar cómo se declaran y se despachan, para que no terminen en un `switch` de 300 líneas con reglas dispersas — y, sobre todo, para que agregar una carta sin su efecto sea un error de compilación, no un olvido que se descubre jugando.

## What Changes

- Contrato de efecto: `EffectHandler = (state, player, params) => Result<{ state, events }, RuleViolation>` — misma forma que `applyCommand` (ADR 0004).
- Tabla de despacho `EFFECTS: Record<CardName, EffectHandler>` con `satisfies` (mismo patrón que `DECK_COMPOSITION`): agregar un personaje a `CARD` sin agregar su entrada aquí no compila.
- Las ocho entradas apuntan, por ahora, al mismo `noEffect` — un resultado válido y explícito ("esta carta no tiene efecto todavía"), no un caso olvidado. Cada una de #14 a #17 reemplaza una o dos entradas por la implementación real.
- **BREAKING**: `Command.Discard` gana `target?: PlayerId` y `guess?: CardName`, genéricos para las ocho cartas. Qué carta exige cuál se valida en runtime, no en el tipo (issue #18).
- `applyDiscard` se reordena: descartar la carta → **resolver el efecto** → avanzar el turno (con los jugadores ya actualizados por el efecto, por si eliminó a alguien).

## Non-goals

- Ningún efecto real se implementa aquí. Descartar cualquier carta —incluida la Princesa— sigue sin eliminar a nadie: las ocho entradas de la tabla son el mismo `noEffect`. Eso es #14–#17.
- No se valida qué parámetro exige cada carta, ni que un objetivo sea legal (no eliminado, no protegido), ni que el Guardia no adivine "Guardia": eso es #18, dueño también de `legalMoves`.
- No hay eventos nuevos de efecto (por ejemplo, una revelación del Sacerdote): `noEffect` no produce eventos propios, solo los que ya produce `applyDiscard` (`CardDiscarded`, `TurnChanged`).

## Capabilities

### New Capabilities

- `effect-dispatch`: el contrato de efecto y la tabla de despacho exhaustiva.

### Modified Capabilities

- `turn-cycle`: descartar resuelve el efecto de la carta entre el descarte y el avance de turno (requirement nueva; las existentes sobre validación y avance de turno no cambian).

## Impact

- `packages/engine/src/effect.ts` (nuevo): `EffectParams`, `EffectHandler`, `EFFECTS`, `noEffect`.
- `packages/engine/src/command.ts`: `Command.Discard` gana `target?`/`guess?`; `applyDiscard` despacha a `EFFECTS[card]` entre el descarte y el avance de turno.
- `packages/engine/src/server.ts`: no cambia su lista de exports (`EFFECTS`/`EffectHandler` son detalle interno de `applyCommand`, no autoridad que alguien más consuma todavía).
