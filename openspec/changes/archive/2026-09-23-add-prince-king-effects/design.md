## Context

`EFFECTS.Guard`, `EFFECTS.Priest` (issue #14) y `EFFECTS.Baron`, `EFFECTS.Handmaid` (issue #15) ya son reales. `legalTargets`/`resolveTarget` en `effect.ts` validan objetivo activo, no protegido y distinto de quien juega para las tres primeras cartas de objetivo; `eliminate`/`requireActive` viven en `state.ts` como caminos compartidos. Ver proposal.md - Why para la motivación de #16.

## Goals / Non-Goals

- Objetivo: `EFFECTS.Prince` y `EFFECTS.King` dejan de ser `noEffect`.
- Objetivo: el auto-objetivo obligatorio del Príncipe cuando todos los rivales están protegidos se exige, no se infiere.
- No objetivo: validadores previos a la jugada (p. ej. que la Condesa sea obligatoria si hay Rey o Príncipe en mano) — eso es #18.
- No objetivo: fin de ronda o de partida (#19, #20).
- No objetivo: Condesa y Princesa como cartas jugables con efecto propio — issue #17.

## Decisions

### El Rey reutiliza `legalTargets`/`resolveTarget` tal cual; el Príncipe necesita una función propia

El Rey comparte exactamente la misma regla de legalidad que Guardia/Sacerdote/Barón (activo, no protegido, distinto de quien juega), así que se suma a la función compartida sin tocarla — mismo patrón que Barón en #15.

El Príncipe es la primera carta cuyo objetivo puede ser uno mismo, así que necesita su propia `legalTargetsForPrince`/`resolvePrinceTarget`, privadas en `effect.ts`, separadas de las compartidas (que excluyen a `self` por diseño desde #14). La diferencia clave: `legalTargetsForPrince` SIEMPRE incluye a quien juega, además de cualquier otro activo no protegido — así que nunca hay cero objetivos legales, y `resolvePrinceTarget` nunca toma la rama de fizzle que sí existe en la función compartida. Omitir el objetivo siempre es `MissingTarget`, incluso cuando el único objetivo posible es uno mismo: el issue pide explícitamente que el motor "lo exija, no lo sugiera."

Alternativa descartada: generalizar `legalTargets`/`resolveTarget` con un parámetro `{ allowSelf: boolean }`. Rechazada porque el comportamiento de fizzle-si-vacío deja de aplicar para el Príncipe (nunca está vacío), así que compartir la función obligaría a una rama condicional adicional en el único sitio que la usa distinto — más confuso que dos funciones pequeñas y explícitas.

### Un Príncipe que se apunta a sí mismo no necesita ningún caso especial

Cuando `EFFECTS[card]` corre (issue #13), quien juega ya quedó reducido a una sola carta (`remaining`) en el estado que recibe el efecto — `applyDiscard` ya hizo esa normalización antes de despachar. Así que `resolvePrinceTarget` devuelve un `ActivePlayer` con exactamente una `held`, sea quien juega o cualquier otro activo: el código de "descarta y roba" no distingue el caso de auto-objetivo del caso de un rival.

### El descarte forzado del objetivo no dispara el efecto de la carta descartada

Si el Príncipe fuerza a alguien a descartar, por ejemplo, un Guardia, esa persona NO adivina nada — coincide con la regla real del juego, y el issue solo menciona el caso especial de la Princesa como excepción. `resolvePrince` comprueba directamente si la carta forzada es `'Princess'`; para cualquier otra carta, el resultado es únicamente "se fue, entró una nueva", sin invocar `EFFECTS[cartaForzada]`.

### Ningún evento nuevo para Príncipe ni Rey

El descarte forzado del Príncipe reutiliza `CardDiscarded` (público, `player: target.id` — el descarte siempre se ve, a diferencia del Barón no hay nada que ocultar aquí). La carta nueva que roba el objetivo reutiliza `CardDrawn` (restringido a `[target.id]`, mismo shape que el robo normal de turno). La eliminación por Princesa forzada reutiliza `PlayerEliminated` tal cual.

El intercambio del Rey no genera ningún evento: cada mano ya se proyecta en vivo por jugador vía `handOf`/`view.ts`, mismo patrón que la protección de la Sirvienta en #15. A diferencia del Barón, el Rey no produce ningún resultado sensible que ocultar (no hay comparación, no hay ganador) — no hay tensión de privacidad real que justifique inventar un evento.

### La carta apartada no necesita marcarse como "consumida"

Si el mazo está vacío cuando se resuelve el Príncipe, el objetivo roba `round.setAside` en vez de `round.deck[0]`. Rastreado explícitamente si esto puede duplicar esa carta en un segundo robo: no puede. `applyDraw` (issue #12) ya rechaza con `DeckEmpty` cualquier robo normal de inicio de turno en cuanto `deck.length === 0`, así que ningún jugador puede completar otro turno —ni siquiera llegar a la fase de descarte— una vez que el mazo se vacía. El único Príncipe que puede necesitar la apartada es el de ESE mismo turno final; no puede haber un segundo. No se agrega ningún campo nuevo a `Round`.

## Risks / Trade-offs

- [El loop "cada personaje sin efecto implementado" y el playthrough de punta a punta en `command.test.ts` fallarán al volverse reales Príncipe y Rey] → Mismo ajuste que #14 y #15: excluir Prince/King del loop, y darles un target legal en el playthrough (posiblemente uno mismo para el Príncipe si todos los rivales terminan protegidos).
- [Un Príncipe que fuerza la eliminación del único rival activo en una partida a 2, o un Rey/Príncipe jugado cuando solo queda un jugador activo] → Mismo riesgo ya aceptado y documentado en #14/#15: sin fin de ronda (#19), el juego sigue de forma rara (el ganador se vuelve a jugar a sí mismo vía el ajuste de `nextActivePlayer`) en vez de terminar la ronda. Se evita en las pruebas de playthrough eligiendo objetivos/circunstancias que no disparen esta eliminación, salvo que se esté probando justamente eso.

## Open Questions

Ninguna.
