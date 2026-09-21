## 1. Utilidades compartidas de estado

- [x] 1.1 Agregar `eliminate(player: ActivePlayer): EliminatedPlayer` y `requireActive(round: Round, id: PlayerId): ActivePlayer` a `state.ts`, según design.md — Decisiones. Verificar con `npm run typecheck --workspace packages/engine`.
- [x] 1.2 Reemplazar el `activeTurnPlayer` local de `command.ts` por `requireActive` de `state.ts`. Verificar que las 19 pruebas existentes de `command.test.ts` siguen pasando sin modificarlas.

## 2. Tipos nuevos

- [x] 2.1 Agregar `MissingTarget`, `IllegalTarget` e `InvalidGuess` a `RuleViolation` en `violation.ts`.
- [x] 2.2 Agregar `GuardGuessed`, `PriestPeeked` y `PlayerEliminated` a `GameEvent` en `event.ts`, según design.md — Decisiones (`PlayerEliminated` sin campo de causa). Verificar que compila.

## 3. Objetivo legal, compartido entre las dos cartas

- [x] 3.1 Implementar `legalTargets(round, self)` y `resolveTarget(round, player, target)` (privadas a `effect.ts`, compartidas por Guardia y Sacerdote): activo, no protegido, distinto de `self`; `null` cuando no hay ninguno (descarte sin efecto), `MissingTarget`/`IllegalTarget` en los demás casos. Cubre "Guardia y Sacerdote exigen un objetivo activo, no protegido y distinto de quien juega" y "Guardia y Sacerdote se descartan sin efecto si no hay ningún objetivo legal" de `specs/card-effects/spec.md`, con prueba unitaria por escenario en `packages/engine/tests/effect.test.ts` (nuevo archivo).

  **Desviación:** design.md solo describía `legalTargets`; `resolveTarget` se agregó para que Guardia y Sacerdote compartan también las tres ramas de validación (vacío/ausente/ilegal), no solo el cálculo de la lista — mismo espíritu de "no duplicar" que ya pedía el diseño.

## 4. `EFFECTS.Guard`

- [x] 4.1 Implementar `EFFECTS.Guard`: valida objetivo (vía 3.1) → adivinanza (`InvalidGuess` si falta o es "Guard") → compara con la carta del objetivo. Cubre "Adivinar 'Guardia' es una jugada ilegal" en `effect.test.ts`.
- [x] 4.2 Acierto: `eliminate` del objetivo, evento `GuardGuessed` (`hit: true`) + `PlayerEliminated`, ambos agregados a `state.log` por el propio efecto. Cubre "El Guardia elimina al objetivo si acierta su carta" y la mitad de acierto de "El acierto o fallo del Guardia es público, sin revelar la carta si falla".
- [x] 4.3 Fallo: sin cambios de estado más allá del descarte, evento `GuardGuessed` (`hit: false`) sin la carta real del objetivo en ningún campo visible para otros. Cubre "El Guardia no tiene efecto si falla" y la mitad de fallo de "El acierto o fallo del Guardia es público, sin revelar la carta si falla".

  **No anticipado:** implementar Guardia/Sacerdote con objetivo obligatorio rompió dos pruebas de #12/#13 en `command.test.ts` que descartaban cualquier carta sin parámetros — "cada personaje tiene una entrada de efecto declarada" (ahora excluye Guardia y Sacerdote, que ya no son "sin efecto"; su cobertura vive en `effect.test.ts`) y la ronda jugada de punta a punta (ahora calcula un objetivo y, para el Guardia, una adivinanza que a propósito no acierta, para no disparar una eliminación que el motor no puede cerrar todavía sin el #19). Ninguna de las dos estaba en el alcance declarado de este cambio.

## 5. `EFFECTS.Priest`

- [x] 5.1 Implementar `EFFECTS.Priest`: valida objetivo (vía 3.1), produce `PriestPeeked` con la carta del objetivo, `audience: [player]`, agregado a `state.log`. Cubre "El Sacerdote revela la mano del objetivo solo a quien lo jugó" en `effect.test.ts`, incluida una prueba con `project` confirmando que ni el objetivo ni un tercero ven el evento.

## 6. Documentación

- [x] 6.1 Actualizar `CLAUDE.md` — sección "Cosas que no existen todavía": Guardia y Sacerdote ya tienen efecto real (issue #14, primera eliminación del motor); Barón, Sirvienta, Príncipe, Rey, Condesa y Princesa siguen pendientes (#15–#17).

## Verificación

<!-- Completar al implementar: salida de npm test, npm run typecheck, npm run lint y npm run format:check en un clon limpio. -->
