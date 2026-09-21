## Context

`effect.ts` tiene `EFFECTS: Record<CardName, EffectHandler>` (issue #13) con las ocho entradas en `noEffect`. `command.ts` tiene `activeTurnPlayer(round, playerId)`, que busca y valida al jugador del turno — pero solo al del turno, no a un objetivo arbitrario. Nadie ha quedado eliminado nunca: `EliminatedPlayer` existe desde el ADR 0007 (#7) pero ninguna operación lo produce todavía. Ver proposal.md — Why para la motivación y specs/card-effects/spec.md para el contrato completo.

## Goals / Non-Goals

**Goals:**

- Implementar `EFFECTS.Guard` y `EFFECTS.Priest` con la lógica real de objetivo, adivinanza y eliminación.
- Dejar `eliminate` y `requireActive` como utilidades compartidas en `state.ts`, listas para que #15–#17 las reutilicen sin duplicar código (#17 lo pide explícitamente: "mismo camino de código, no una rama duplicada").

**Non-Goals:**

- Ningún otro efecto de carta (#15–#17).
- `legalMoves` y la validación general de parámetros por carta (#18): aquí solo se valida lo que Guardia y Sacerdote necesitan para funcionar, no una función reutilizable de enumeración.
- Detección de fin de ronda por eliminación (#19).

## Decisions

### `eliminate` y `requireActive` en `state.ts`, junto a `handOf`

```ts
export function eliminate(player: ActivePlayer): EliminatedPlayer {
  return { status: 'eliminated', id: player.id, discards: [...player.discards, player.held] };
}

/** Un jugador activo por id. Si no existe o no está activo, es un bug de quien llama, no una jugada ilegal. */
export function requireActive(round: Round, id: PlayerId): ActivePlayer {
  const player = round.players.find((candidate) => candidate.id === id);
  if (player === undefined || player.status !== 'active') {
    throw new Error(`Jugador '${id}' no es un activo de la ronda.`);
  }
  return player;
}
```

`command.ts` reemplaza su `activeTurnPlayer` local por `requireActive(round, turn.player)`: mismo comportamiento, ahora compartido. `effect.ts` lo usa para resolver un `target` que ya pasó la validación de objetivo legal.

**Alternativa descartada — dejar `activeTurnPlayer` como está y duplicar la búsqueda en `effect.ts`:** exactamente el tipo de "rama duplicada" que #17 pide evitar para la eliminación; se evita también aquí, un nivel más abajo.

### `legalTargets(round, self)`: objetivo activo, no protegido, no uno mismo

```ts
function legalTargets(round: Round, self: PlayerId): readonly PlayerId[] {
  return round.players
    .filter((p): p is ActivePlayer => p.status === 'active' && p.id !== self && !p.protected)
    .map((p) => p.id);
}
```

Privada a `effect.ts` por ahora — Guardia y Sacerdote son los únicos que la necesitan en este cambio. Barón, Príncipe y Rey (#15–#16) la van a necesitar también; si en ese momento sigue siendo exactamente esta lógica, se comparte entonces. No se exporta preventivamente.

### Orden de validación: objetivo → adivinanza (Guardia) → resolución

```
legalTargets(round, jugador)
  ├─ vacío                                    → sin efecto (ok, sin cambios)
  └─ no vacío
      ├─ target ausente                       → MissingTarget
      ├─ target no está en legalTargets        → IllegalTarget { player, target }
      └─ target legal
          ├─ (solo Guardia) guess ausente o === 'Guard'  → InvalidGuess
          └─ resolver
```

Mismo criterio "quién → cuándo → qué" que ya usa `applyCommand`: primero si hay a quién apuntar, y solo entonces el contenido específico de la carta (la adivinanza).

### El efecto agrega sus propios eventos a `state.log`

`applyDiscard` (#13) solo añade `TurnChanged` al log después de llamar al efecto — asume que el efecto ya dejó los suyos. `noEffect` nunca lo ejerció porque nunca produce eventos; Guardia y Sacerdote son los primeros:

```ts
function resolveGuard(state, player, params): EffectResult {
  // ... validaciones ...
  const target = requireActive(round, params.target);
  const hit = target.held === params.guess;
  const guessed: GameEvent = {
    type: 'GuardGuessed',
    player,
    target: params.target,
    guess: params.guess,
    hit,
    audience: 'public',
  };

  if (!hit) {
    return ok({ state: { ...state, log: [...state.log, guessed] }, events: [guessed] });
  }

  const players = round.players.map((p) => (p.id === target.id ? eliminate(target) : p));
  const eliminatedEvent: GameEvent = {
    type: 'PlayerEliminated',
    player: target.id,
    audience: 'public',
  };

  return ok({
    state: {
      ...state,
      round: { ...round, players },
      log: [...state.log, guessed, eliminatedEvent],
    },
    events: [guessed, eliminatedEvent],
  });
}
```

`resolvePriest` es la misma validación de objetivo, sin adivinanza, y produce un único evento `PriestPeeked` restringido a `[player]`.

### `PlayerEliminated` no incluye cómo se eliminó

Solo `{ player, audience: 'public' }`. El "cómo" ya es reconstruible: en el caso del Guardia, del evento `GuardGuessed` inmediatamente anterior con `hit: true`. Un campo `cause` sería redundante y anticipa una forma que #15–#17 podrían no necesitar igual (Barón compara, Príncipe fuerza descarte, Princesa se autodescarta — tres formas distintas de llegar al mismo evento).

## Qué queda oculto en `PlayerView`

Nada cambia en `view.ts`: el filtrado genérico por audiencia (#10/#11) ya cubre los tres eventos nuevos sin código adicional. `PriestPeeked` con `audience: [player]` queda fuera de la vista de cualquier otro jugador, incluido el objetivo — es la garantía que ya probaba #11 con un evento sintético de un destinatario, ahora con un productor real. La proyección de un jugador eliminado (asiento con solo descartes) también existe desde #10 y no cambia: `eliminate` solo produce el `RoundPlayer` que `project` ya sabe proyectar.

## Risks / Trade-offs

- **`legalTargets` no se exporta ni se comparte todavía.** Si #15/#16 la necesitan idéntica, se corre el riesgo de que la reimplementen en vez de importarla — aceptado porque exportarla ahora sin un segundo consumidor real sería especular. Si diverge (por ejemplo, el Príncipe permite apuntarse a sí mismo), la duplicación deliberada es más clara que una función compartida con una excepción por carta.
- **Los códigos de violación nuevos son específicos de objetivo/adivinanza, no genéricos de "parámetro inválido".** Mismo criterio que #12 (`AlreadyDrew`/`MustDrawFirst`) y #13: cada código nombra el problema exacto.
