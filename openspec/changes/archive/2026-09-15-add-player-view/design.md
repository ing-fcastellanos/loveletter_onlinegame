## Context

`view.ts` hoy es un marcador: `PlayerView = { deckCount: number }` y `project` ignora `playerId`. `state.ts` ya modela `Round.players: RoundPlayer[]` como `ActivePlayer | EliminatedPlayer` en orden de asiento, y `handOf(round, playerId)` ya deriva la mano de dos cartas del jugador en turno. Ver proposal.md — Why para la motivación (ADR 0004) y specs/player-view/spec.md para el contrato completo.

## Goals / Non-Goals

**Goals:**

- Dar forma real a `PlayerView` y a `project(state, playerId)` cumpliendo cada requirement de `specs/player-view/spec.md`.
- Que la forma del tipo sea la que consumirá la Fase 3 sin cambios de raíz: un arreglo de asientos en orden de mesa, no dos listas que la UI tenga que recomponer.

**Non-Goals:**

- Conocimiento derivado de efectos (Sacerdote) — no hay eventos todavía (#11).
- Vista de espectador — el ADR 0004 la deja como re-evaluación futura.
- Cualquier cambio a `GameState`, `Round` o `setup.ts`.

## Decisions

### `PlayerSeatView`: un solo arreglo en orden de asiento, discriminado por `self` y `status`

```ts
export type PlayerSeatView =
  | {
      readonly self: true;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'active';
      readonly hand: Hand;
      readonly discards: readonly CardName[];
      readonly protected: boolean;
    }
  | {
      readonly self: true;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'eliminated';
      readonly discards: readonly CardName[];
    }
  | {
      readonly self: false;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'active';
      readonly hasCard: boolean;
      readonly discards: readonly CardName[];
      readonly protected: boolean;
    }
  | {
      readonly self: false;
      readonly id: PlayerId;
      readonly name: string;
      readonly tokens: number;
      readonly status: 'eliminated';
      readonly discards: readonly CardName[];
    };

export type PlayerView = {
  readonly roundNumber: number;
  readonly deckCount: number;
  readonly faceUp: readonly [] | readonly [CardName, CardName, CardName];
  readonly players: readonly PlayerSeatView[];
  readonly turn: { readonly stage: 'draw' | 'play'; readonly player: PlayerId };
};
```

`players` conserva el orden de `Round.players` (orden de asiento), igual para cualquier `playerId` que pida la vista — lo exige el requirement "El orden de los asientos es el de la partida". Cada elemento se arma combinando el `Player` de nivel partida (id, name, tokens) con el `RoundPlayer` correspondiente de la ronda.

**Alternativa descartada — `self` y `rivals` separados:** más directo para código que solo itera rivales, pero obliga a la Fase 3 a reintercalar por posición de asiento para dibujar la mesa. Se descarta porque el consumidor principal de esta forma (la mesa de juego) necesita el orden de asiento intacto.

### `hasCard: boolean`, no ausencia de campo

Un rival `active` siempre sostiene exactamente una carta (invariante del ADR 0007), así que `hasCard` es siempre `true` hoy — redundante con `status === 'active'`. Se incluye de todas formas porque el ADR 0004 nombra literalmente ese campo como la forma verdadera de la mano ajena, y es el campo que el issue #11 va a ensanchar a `boolean | CardName` cuando el Sacerdote revele algo. Mantener el campo ahora evita que #11 tenga que introducir uno nuevo.

**Alternativa descartada — omitir el campo:** más minimalista hoy, pero difiere a #11 la decisión de cómo nombrar y tipar la revelación, en vez de solo ensanchar un tipo ya existente.

### `turn` sin `drawn`, siempre

`Round.turn` en la fase `play` incluye `drawn: CardName`. La vista nunca expone ese campo: si quien juega es el propio jugador que pide la vista, la carta ya está en su `hand` (vía `handOf`); si es un rival, no debe verse. En vez de proyectar `Round.turn` y quitarle un campo caso por caso, `project` construye un tipo de turno reducido —`{ stage, player }`— que no tiene dónde poner `drawn`.

### `project` no valida `playerId`

`playerId` que no está sentado en la partida es un error de quien llama, no un caso de juego. `project` sigue la firma fija del ADR 0004 (`PlayerView`, no `Result`), así que no hay dónde devolver un rechazo sin romper el contrato de la Fase 3. El servidor de la Fase 4 deriva `playerId` de la sesión autenticada del jugador, que por construcción está sentado; las pruebas del motor son las únicas que podrían pasar un id inválido, y no es un caso que este cambio necesite cubrir.

### La prueba de fuga compara contra los valores ocultos reales, no contra texto

`contract.test.ts` hoy busca nombres de carta ausentes en el JSON serializado. Esa técnica deja de alcanzar en cuanto la vista expone la mano propia y las descubiertas: el mismo nombre de carta puede ser legítimo en un campo y oculto en otro del mismo estado (por ejemplo, "Guard" en la mano propia y también la carta apartada de otra ronda). La prueba exhaustiva de este cambio arma, para cada estado de prueba, el conjunto de valores prohibidos —`round.setAside`, cada carta de `round.deck`, y el `held` de cada rival activo— y verifica que ningún campo de la vista serializada coincide con ninguno de ellos. Se corre sobre varios estados (distinto número de jugadores, distinta fase de turno, con y sin eliminados) para cubrir las combinaciones del spec.

## Risks / Trade-offs

- **La forma de `PlayerSeatView` es una unión de 4 miembros.** Es más verbosa que una sola forma con campos opcionales, pero cada campo opcional habría sido un hueco por donde una fuga pasa desapercibida (exactamente lo que el ADR 0004 quiere evitar). Se acepta la verbosidad.
- **`contract.test.ts` se reescribe casi por completo.** Es intencional: la prueba actual solo podía existir porque `PlayerView` no tenía nada que mostrar.
