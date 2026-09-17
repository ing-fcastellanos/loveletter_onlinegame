## Context

`command.ts` tiene solo el marcador `Command = { type: 'Draw'; playerId }`. `violation.ts` tiene `NotYourTurn` y `CardNotInHand`, sin nada que los produzca. `state.ts` ya modela `Turn = { stage: 'draw', player } | { stage: 'play', player, drawn }` y `RoundPlayer = ActivePlayer | EliminatedPlayer`. `event.ts` (issue #11) ya tiene `GameEvent` con sus cuatro variantes y `Audience`, pero solo `RoundStarted` tiene productor real (`startMatch`). Ver proposal.md — Why para la motivación (Hito 1 del PDD) y specs/turn-cycle/spec.md para el contrato completo.

## Goals / Non-Goals

**Goals:**

- `applyCommand(state, cmd): Result<{ state, events }, RuleViolation>` con la forma definitiva del ADR 0004, cubriendo `Draw` y `Discard`.
- Que `CardDrawn`, `CardDiscarded` y `TurnChanged` —definidos en #11 pero nunca producidos— por fin tengan quién los emita.

**Non-Goals:**

- Ningún efecto de carta (Fase 2, issues #13–#17). Descartar la Princesa no elimina a nadie en este cambio.
- Ninguna validación de contenido de jugada: Condesa obligatoria, objetivos legales, "Guardia" no se puede adivinar (#18, dueño también de `legalMoves`).
- Detección de fin de ronda —mazo vacío al terminar un turno, o un solo jugador en pie— (#19). Este cambio deja jugar hasta que el mazo se vacía, no gestiona qué pasa después.

## Decisions

### `applyCommand` vive en `command.ts`, junto a `Command`

Seguido el mismo patrón que `view.ts` (tipo + `project`), `state.ts` (tipos + `handOf`) y `setup.ts` (tipos + `startMatch`/`dealRound`): el tipo y su operación principal comparten archivo.

### `Command.Discard` apunta por valor de carta, no por posición

```ts
export type Command =
  | { readonly type: 'Draw'; readonly playerId: PlayerId }
  | { readonly type: 'Discard'; readonly playerId: PlayerId; readonly card: CardName };
```

Con dos cartas en mano, identificar cuál descartar por su `CardName` es suficiente: si ambas son iguales (hay hasta 5 Guardias en el mazo), el resultado de descartar cualquiera de las dos instancias es idéntico. Es también el criterio que usará el Guardia para adivinar (Fase 2): apuntar por valor, no por posición.

### Tres violaciones nuevas, específicas como las dos que ya existen

```ts
export type RuleViolation =
  | { readonly code: 'NotYourTurn'; readonly player: PlayerId; readonly current: PlayerId }
  | { readonly code: 'CardNotInHand'; readonly player: PlayerId; readonly card: CardName }
  | { readonly code: 'AlreadyDrew'; readonly player: PlayerId }
  | { readonly code: 'MustDrawFirst'; readonly player: PlayerId }
  | { readonly code: 'DeckEmpty'; readonly player: PlayerId };
```

`AlreadyDrew`/`MustDrawFirst` en vez de un único `WrongStage { player, stage }`: mantiene el estilo ya establecido de códigos específicos (`NotYourTurn`, `CardNotInHand`), y cada uno nombra el problema exacto sin que la presentación tenga que ramificar sobre un campo de datos para decidir el mensaje.

`DeckEmpty` es un `RuleViolation`, no una excepción: a diferencia de una invariante interna del motor, robar con el mazo vacío es algo que un cliente real de la Fase 4 puede intentar antes de que el #19 exista para impedirlo — exactamente el caso que el ADR 0004 reserva para `Result`, no para lanzar.

### Orden de validación: quién → cuándo → qué

1. `NotYourTurn` — ¿es el jugador correcto?
2. `AlreadyDrew` / `MustDrawFirst` — ¿la fase del turno admite este comando?
3. Específico del comando: `DeckEmpty` para `Draw`; `CardNotInHand` para `Discard`.

Mismo criterio que ya usa `dealRound` (número de jugadores → número de ronda → quién empieza): un orden fijo, documentado, y probado.

### `Draw` produce `CardDrawn`; `Discard` produce `CardDiscarded` + `TurnChanged`

Cierra el círculo de #11: los cuatro eventos base ya existían como tipo, pero solo `RoundStarted` tenía productor. Un descarte siempre termina el turno de quien lo hizo y empieza el del siguiente, así que sus dos eventos públicos se producen juntos, en ese orden.

Los eventos que devuelve `applyCommand` son exactamente los que se agregan a `state.log` — no una copia filtrada ni una vista distinta. Filtrar por audiencia sigue siendo trabajo exclusivo de `project` (#10/#11); `applyCommand` vive en la superficie de autoridad y no conoce "el jugador que mira".

### Avanzar el turno: `nextActivePlayer` asume que hay adónde avanzar

```ts
function nextActivePlayer(round: Round, fromId: PlayerId): PlayerId;
```

Recorre `round.players` en orden de asiento, en círculo desde `fromId`, y devuelve el primer `status: 'active'` que encuentre. Si no encuentra ninguno —solo puede pasar si la ronda ya debió terminar y el #19 (que no existe todavía) no lo impidió— hace ruido con una excepción, igual que `findPlayer` en `view.ts` ante ids desalineados: es un bug de orquestación, no una jugada ilegal de un cliente, así que no es un `RuleViolation`.

**Alternativa descartada — devolver `Result`/`null` cuando no hay siguiente activo:** obligaría a que `applyCommand` maneje un caso que, dentro del alcance de este cambio (nadie se elimina todavía), es sencillamente inalcanzable salvo con una ronda armada a mano a propósito para probar el salto. Se prueba igual —con una ronda así— pero sin ensuciar la firma de retorno con un caso que el #19 va a prevenir estructuralmente.

## Risks / Trade-offs

- **Nadie se elimina en este cambio**, así que "saltar eliminados" solo se ejercita con rondas armadas a mano en las pruebas (mismo patrón que #10/#11: probar el mecanismo antes de que exista quien lo alimente con datos reales). No hay forma de probarlo con una partida jugada de punta a punta usando solo `applyCommand`, porque no existe manera de eliminar a nadie todavía.
- **`Command` y `RuleViolation` cambian de forma** (uniones más grandes). Cualquier `switch` exhaustivo existente sobre ellos deja de compilar hasta cubrir los casos nuevos — no hay ninguno todavía en el repo, así que el impacto es nulo en la práctica.

## Qué queda oculto en `PlayerView`

Nada cambia respecto a #10/#11: `applyCommand` no toca `view.ts` ni el contrato de `PlayerView`. Los eventos nuevos (`CardDrawn`, `CardDiscarded`, `TurnChanged`) ya estaban en `specs/game-events/spec.md` con su audiencia decidida desde #11 — este cambio solo los produce, no cambia qué es público ni qué es privado.
