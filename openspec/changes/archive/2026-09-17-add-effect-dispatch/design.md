## Context

`command.ts` tiene `applyCommand`/`applyDiscard` del issue #12: descartar mueve la carta a los descartes y avanza el turno, sin resolver ningún efecto. `cards.ts` ya usa el patrón `as const satisfies Record<CardName, number>` para `DECK_COMPOSITION` — exige las ocho claves sin ensanchar los literales. Ver proposal.md — Why para la motivación y specs/effect-dispatch/spec.md + specs/turn-cycle/spec.md (delta) para el contrato completo.

## Goals / Non-Goals

**Goals:**

- Contrato de efecto y tabla de despacho exhaustiva sobre las ocho cartas, con las ocho apuntando a un `noEffect` compartido.
- `Command.Discard` acepta ya los parámetros que un efecto pueda necesitar (objetivo, carta adivinada), genéricos para las ocho cartas.
- `applyDiscard` resuelve el efecto entre el descarte y el avance de turno, dejando el punto de enganche listo para #14–#17.

**Non-Goals:**

- Ningún efecto real (#14–#17).
- Validación de qué parámetro exige cada carta, de objetivos legales, o de la restricción del Guardia sobre sí mismo (#18, dueño también de `legalMoves`).
- Eventos nuevos de efecto: `noEffect` no produce ninguno.

## Decisions

### `effect.ts` nuevo: contrato, parámetros y tabla

```ts
export type EffectParams = { readonly target?: PlayerId; readonly guess?: CardName };

export type EffectResult = Result<
  { readonly state: GameState; readonly events: readonly GameEvent[] },
  RuleViolation
>;

export type EffectHandler = (
  state: GameState,
  player: PlayerId,
  params: EffectParams,
) => EffectResult;

function noEffect(state: GameState): EffectResult {
  return ok({ state, events: [] });
}

export const EFFECTS = {
  Guard: noEffect,
  Priest: noEffect,
  Baron: noEffect,
  Handmaid: noEffect,
  Prince: noEffect,
  King: noEffect,
  Countess: noEffect,
  Princess: noEffect,
} as const satisfies Record<CardName, EffectHandler>;
```

Mismo patrón que `DECK_COMPOSITION` (`as const satisfies Record<CardName, ...>`): agregar un personaje a `CARD` sin agregar su entrada aquí dejaría a `EFFECTS` sin una clave que `Record<CardName, EffectHandler>` exige, y eso no compila — el criterio de éxito del issue, demostrado hacia una novena carta futura.

`EFFECTS`, `EffectHandler` y `EffectParams` no se exportan desde `server.ts`: son detalle interno de cómo `applyCommand` despacha. Cuando #14 reemplace `Guard: noEffect` por su implementación real, no necesita re-exportar nada — sigue siendo un detalle de `command.ts`/`effect.ts`.

**Alternativa descartada — `switch` exhaustivo con `assertNever`:** también daría exhaustividad verificada por el compilador, pero introduce un idioma nuevo en el repo cuando `DECK_COMPOSITION` ya resuelve el mismo problema con `satisfies`. Se prefiere el patrón ya establecido.

### `Command.Discard` con `target?`/`guess?` genéricos, no por carta

```ts
export type Command =
  | { readonly type: 'Draw'; readonly playerId: PlayerId }
  | {
      readonly type: 'Discard';
      readonly playerId: PlayerId;
      readonly card: CardName;
      readonly target?: PlayerId;
      readonly guess?: CardName;
    };
```

El propio issue #18 describe "el Guardia exige objetivo y carta adivinada" como algo que **valida**, no algo que el tipo ya garantiza — ese es el lugar natural para la precisión por carta, no este cambio. Cualquier `Command` que cruce el WebSocket en la Fase 4 necesita validación en runtime de todos modos: JSON no conserva la forma exacta de una unión distribuida por carta.

**Alternativa descartada — unión distribuida por carta ya en #13:** más segura de tipos hoy, pero le quita a #18 buena parte de lo que su propio Objetivo describe como su trabajo, y complica el tipo de `Command` antes de que ninguna carta real lo necesite.

### `applyDiscard` se reordena: descartar → resolver efecto → avanzar turno

```
validar (turno, fase, carta en mano)
  → mover la carta a los descartes, actualizar la mano        (igual que #12, infalible)
  → EFFECTS[card](estado-con-descarte-aplicado, jugador, { target, guess })
      → si falla: err(violación) — nada de lo anterior se expone al llamador
      → si tiene éxito: toma el estado que devuelve el efecto
  → siguiente jugador activo, calculado sobre ESE estado       (por si el efecto eliminó a alguien)
  → avanzar turno, emitir CardDiscarded + TurnChanged
```

El efecto se resuelve **después** de aplicar el descarte, no antes: así ve el estado con la mano y los descartes del jugador ya actualizados, y el futuro cálculo del siguiente jugador activo (#14+) ve a cualquier eliminado que el efecto haya producido. Que el efecto pueda fallar no rompe la atomicidad: todo el estado se construye como valor y solo se expone envuelto en `ok(...)`; si `EFFECTS[card]` devuelve `err(...)`, `applyDiscard` lo propaga de inmediato y el estado que ya se había construido nunca llega al llamador — mismo patrón que ya prueba #12 ("el estado original queda intacto").

Con `noEffect`, el resultado observable de este cambio es idéntico al de #12: `noEffect` devuelve el mismo estado que recibe, sin eventos propios.

## Qué queda oculto en `PlayerView`

Nada cambia: este cambio no toca `view.ts`. `target`/`guess` viajan en el `Command` (lo que el jugador envía), no en el estado ni en la vista — y `noEffect` no produce ningún evento ni campo nuevo que `project` tuviera que filtrar.

## Risks / Trade-offs

- **`target`/`guess` sin validar todavía.** Un `Discard` con un objetivo inventado o una carta adivinada absurda se acepta sin queja hasta que exista una carta real que los use (#14+) o #18 valide su contenido. Es el costo aceptado de dejarle esa responsabilidad a #18, según se decidió arriba.
- **`applyDiscard` cambia de forma internamente** aunque su resultado observable con `noEffect` sea idéntico al de #12. El riesgo es de refactor, no de comportamiento: las 16 pruebas de `command.test.ts` (#12) siguen pasando sin cambios.
