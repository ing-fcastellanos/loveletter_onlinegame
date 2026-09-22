## Context

`EFFECTS.Guard` y `EFFECTS.Priest` ya son reales (issue #14): `legalTargets`/`resolveTarget` en `effect.ts` validan objetivo activo, no protegido y distinto de quien juega, y `eliminate`/`requireActive` viven en `state.ts` como caminos compartidos de eliminación e invariante. Ver proposal.md - Why para la motivación de #15.

## Goals / Non-Goals

- Objetivo: `EFFECTS.Baron` y `EFFECTS.Handmaid` dejan de ser `noEffect`.
- Objetivo: la protección se limpia en el punto correcto del ciclo de turno, sin importar qué carta se jugó.
- No objetivo: validadores previos a la jugada más allá de lo que Barón necesita para sí mismo (issue #18 — p. ej. Condesa obligatoria, `legalMoves`).
- No objetivo: fin de ronda o empate por suma de descartes (issue #19).
- No objetivo: forzar el auto-objetivo del Príncipe cuando todos los rivales están protegidos (issue #16 — ese caso especial pertenece a `resolvePrince`, no a este cambio).

## Decisions

### El Barón reutiliza `legalTargets`/`resolveTarget` tal cual

Sin cambios a esas funciones: ya excluyen protegidos, a uno mismo y a inactivos, que es exactamente lo que el Barón necesita. Sin objetivo legal, `resolveBaron` devuelve `ok({state, events: []})` — el mismo fizzle que Guardia y Sacerdote.

Alternativa descartada: una función de legalidad separada para el Barón. Rechazada porque el criterio de legalidad es idéntico byte a byte al de Guardia/Sacerdote, y el issue #15 explícitamente generaliza la regla ("un jugador protegido no es objetivo legal para ninguna carta").

### El objetivo del Barón es privado; solo la eliminación es pública

Decisión confirmada con el usuario durante la exploración (dos opciones planteadas: objetivo privado vs. objetivo público como el Guardia). Se eligió: ningún evento nuevo nombra al objetivo del Barón. La comparación completa (ambas cartas) va en un evento nuevo `BaronCompared`, con audiencia `[player, target]`. Si hay eliminación, se reutiliza el `PlayerEliminated` público ya existente (issue #14) sin cambios — ese evento ya no lleva carta, solo el id de quien fue eliminado.

Consecuencia aceptada: para un tercero, un Barón empatado es indistinguible de un Barón sin ningún objetivo legal (ambos casos producen exactamente `CardDiscarded` + `TurnChanged`, nada más). Es el mismo patrón de opacidad que ya tiene el fizzle de Guardia/Sacerdote — no es una laguna nueva, es consistente con cómo el motor ya trata "no pasó nada observable".

Alternativa descartada: revelar el objetivo públicamente (como `GuardGuessed`). Encajaría con cómo funciona la mesa física, pero el criterio de éxito del issue ("un tercero solo ve quién quedó eliminado") apunta a la opción más estricta, y el usuario la confirmó.

### `BaronCompared`: un solo evento restringido con ambas cartas

```ts
{
  type: 'BaronCompared';
  player: PlayerId;
  target: PlayerId;
  playerCard: CardName;
  targetCard: CardName;
  audience: readonly PlayerId[]; // siempre [player, target]
}
```

Un solo evento para los dos implicados (no dos eventos espejados) — mismo patrón que ya usa el resto del log: la audiencia es una lista, no hay necesidad de duplicar. No lleva un campo de resultado explícito (a diferencia de `hit` en `GuardGuessed`): las dos cartas ya son suficientes para que cualquiera de los dos implicados derive el resultado comparando valores públicos de `CARD`; `GuardGuessed` necesita `hit` porque el caso de fallo oculta la carta real, aquí no hay nada que ocultar entre los dos implicados.

### La Sirvienta no genera ningún evento propio

Confirmado contra `view.ts`/`view.test.ts`: `protected` de cualquier jugador activo ya se proyecta en vivo en `PlayerView` (`la protección de un rival es visible`), calculado directo de `round.players`, no del log. Añadir un evento sería duplicar información que el estado ya expone. `resolveHandmaid` solo marca `protected: true` en la entrada del jugador; `events: []`.

### Limpiar la protección es responsabilidad del avance de turno, no del efecto de la Sirvienta

"Protegido hasta el inicio de tu turno siguiente" no es algo que la Sirvienta pueda programar de antemano — depende de cuándo vuelve a ser el turno de ese jugador, algo que decide `applyDiscard` en `command.ts` al calcular `nextActivePlayer`. La limpieza se implementa ahí: al construir `newRound` con el `turn` nuevo, la entrada de `next` en `round.players` pierde su protección si la tenía, sin importar qué carta se jugó para llegar a ese punto.

Esto convierte "limpiar protección" en parte del camino COMPARTIDO de avance de turno — afecta a cualquier partida desde este cambio en adelante, no solo cuando alguien jugó la Sirvienta (que es, de hecho, el único lugar donde `protected` puede volverse `true`, así que en la práctica es un no-op salvo que haya una Sirvienta pendiente de expirar).

Alternativa descartada: extraer un helper compartido en `state.ts` (como `eliminate`/`requireActive` en #14). Rechazada por ahora — a diferencia de `eliminate`, ningún issue futuro pide explícitamente reutilizar "limpiar protección al iniciar turno" en otro lugar; `nextActivePlayer` mismo ya es privado a `command.ts` y no hay una segunda llamada. Si un cambio futuro (p. ej. #19, fin de ronda) necesita el mismo paso, se extrae entonces.

### El Barón elimina con `eliminate()` existente

Mismo camino que ya usa `resolveGuard`: `eliminate(target)` o `eliminate(self)` según quién pierda, sustituyendo esa entrada en `round.players`. No hay lógica de eliminación nueva que escribir.

## Risks / Trade-offs

- [Los dos tests de `command.test.ts` que #14 ya tuvo que tocar (el loop "cada personaje sin efecto implementado..." y el playthrough de punta a punta) fallarán de nuevo al volverse reales Barón y Sirvienta] → Extender el filtro del loop para excluir también `Baron` y `Handmaid`, y darle al playthrough un target legal + manejar el caso donde el naipe robado sea `Baron` (podría eliminar a alguien) igual que ya se maneja `Guard`/`Priest`.
- [Una partida a 2 jugadores donde el Barón elimina al único rival activo] → Mismo riesgo ya documentado en #14 para el Guardia: sin fin de ronda (#19), `nextActivePlayer` explota si ya no queda ningún activo salvo quien jugó. Se evita en las pruebas eligiendo manos donde no gane el Barón salvo que se esté probando justamente eso, igual que #14 lo evitó con adivinanzas garantizadas de fallar.

## Open Questions

Ninguna.
