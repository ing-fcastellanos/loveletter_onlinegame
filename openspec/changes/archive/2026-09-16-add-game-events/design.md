## Context

`state.ts` modela `GameState = { seed, players, round }`. `view.ts` modela `PlayerView` como una proyección plana (visto en #10): `roundNumber`, `deckCount`, `faceUp`, `players: PlayerSeatView[]`, `turn`. `setup.ts` tiene `startMatch`/`dealRound`, ninguno de los dos toca eventos. No existe `applyCommand` (issue #12) ni `Command` real (solo un marcador). Ver proposal.md — Why para la motivación (ADR 0004) y las specs de `game-events`, `game-state`, `player-view` y `round-setup` para el contrato completo.

## Goals / Non-Goals

**Goals:**

- Dar forma a `GameEvent` y `Audience`, y hacer que `GameState`/`PlayerView` los lleven con el filtrado correcto.
- Que `startMatch` deje un evento real en el log, sin inventar comandos que no existen todavía.

**Non-Goals:**

- `applyCommand` y los comandos de robar/descartar/turno (#12).
- Eventos de Fase 2 (Sacerdote, Barón) y de fin de ronda/partida (#19, #20).
- Cambiar la firma de `dealRound`.

## Decisions

### `GameEvent` en `event.ts`, discriminado por `type`

```ts
export type Audience = 'public' | readonly PlayerId[];

export type GameEvent =
  | {
      readonly type: 'RoundStarted';
      readonly round: number;
      readonly first: PlayerId;
      readonly audience: 'public';
    }
  | {
      readonly type: 'CardDrawn';
      readonly player: PlayerId;
      readonly card: CardName;
      readonly audience: readonly PlayerId[];
    }
  | {
      readonly type: 'CardDiscarded';
      readonly player: PlayerId;
      readonly card: CardName;
      readonly audience: 'public';
    }
  | { readonly type: 'TurnChanged'; readonly player: PlayerId; readonly audience: 'public' };
```

`type` como discriminante, no `status` ni `stage`: ya es la convención de `Command` (`{ type: 'Draw' }`) — un evento es un mensaje, no un estado, a diferencia de `RoundPlayer.status`/`Turn.stage`.

**Alternativa descartada — audiencia como campo compartido fuera de la unión** (`{ audience: Audience } & EventData`): el resto del motor (`Turn`, `RoundPlayer`, `RuleViolation`, `SetupViolation`) siempre inlinea los campos por variante, sin intersecciones. Se mantiene la convención.

### `GameState.log: readonly GameEvent[]`, no `Round.log`

El registro vive en el estado completo, no en la ronda: el ADR 0004 lo dice explícitamente, y el issue #20 (fin de partida) necesita un evento público que sobreviva al fin de una ronda. Si viviera en `Round`, se perdería cada vez que `dealRound` construye la ronda siguiente.

### `startMatch` siembra el primer `RoundStarted`; `dealRound` no toca eventos

`dealRound` sigue siendo una función pura de reparto (`Result<Round, SetupViolation>`, sin cambios de firma): no tiene ni necesita el registro de eventos, solo construye la ronda. `startMatch` es quien arma `GameState` completo, así que es quien tiene toda la información para construir el evento (`round: 1`, `first`) sin que `dealRound` se la devuelva. El futuro comando de encadenar rondas (#20) hará lo mismo: llamar `dealRound` y armar su propio `RoundStarted` alrededor del `Round` que reciba.

**Alternativa descartada — `dealRound` devuelve `Result<{ round, event }, SetupViolation>`:** cambia la firma de una función ya publicada y usada por 22 pruebas doradas (#9), para pasar información que el llamador ya tiene (el número de ronda y quién empieza son sus propios parámetros). Se descarta por invasiva y sin beneficio.

### `PlayerView.log` conserva el evento completo, incluida su `audience`

`project` filtra con `event.audience === 'public' || event.audience.includes(playerId)` y expone el evento tal cual pasa el filtro — no se define un tipo "evento visto" que le quite el campo `audience`. Quien lo ve ya está en esa audiencia (es público, o él mismo es uno de los destinatarios), así que saber quién más la comparte no es una fuga nueva.

**Alternativa descartada — un tipo reducido sin `audience` para la vista:** exige mantener dos jerarquías de tipos en paralelo por una simplificación que no cierra ninguna fuga real. Se descarta por complejidad sin beneficio (ver ADR 0004: la información oculta es la que no se puede reconstruir con lo que el jugador ya sabe; aquí no aplica).

### Qué queda oculto en `PlayerView` tras este cambio

Nada nuevo se oculta ni se expone respecto a #10: el registro de eventos es la única superficie nueva, y por construcción (`Audience`) un evento restringido a otros jugadores no aparece en absoluto en la vista de un tercero — ni el evento, ni un resumen, ni un marcador de "algo pasó". El único evento con audiencia restringida de este cambio, `CardDrawn`, solo es visible para quien robó.

### Sin comando real, se prueba con estados armados a mano

Igual que `project` se probó en #10 antes de que existiera ningún comando, aquí `GameState`/`log` de prueba se arman directamente como literales — incluido un evento sintético de audiencia de dos jugadores (por ejemplo `['ana', 'beto']`) para cubrir el caso general de audiencia multi-destinatario, que ningún evento base de este cambio usa (ese caso es de Sacerdote/Barón, Fase 2).

## Risks / Trade-offs

- **`GameState` gana un campo obligatorio.** Todo `GameState` de prueba existente deja de compilar hasta agregarle `log`. Es mecánico y ya está mapeado en proposal.md — Impact; no debería revelar sorpresas como la de `services/api` en #10, porque esta vez se buscó de antemano.
- **`CardDrawn` es redundante con el propio estado** (el jugador ya ve la carta en su mano vía `PlayerView.players[self].hand`). Se acepta porque el propósito del log es narrar y disparar animaciones, no informar algo que el estado no supiera ya — el mismo principio que hace útil `TurnChanged` aunque el turno ya sea visible en `PlayerView.turn`.
