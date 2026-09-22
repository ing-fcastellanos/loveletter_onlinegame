## 1. Evento nuevo del Barón

- [x] 1.1 Agregar el miembro `BaronCompared` a `GameEvent` en `packages/engine/src/event.ts` (`player`, `target`, `playerCard`, `targetCard`, `audience: readonly PlayerId[]`) y verificar que `npm run typecheck --workspace packages/engine` sigue en verde.

## 2. Efecto del Barón

- [x] 2.1 Implementar `resolveBaron` en `packages/engine/src/effect.ts`: reutiliza `resolveTarget`/`legalTargets` sin modificarlas; fizzle (`ok({state, events: []})`) si no hay objetivo legal.
- [x] 2.2 Con objetivo resuelto, comparar `CARD[self.held]` vs `CARD[target.held]` (self vía `requireActive(state.round, player)` sobre el estado post-descarte) y construir siempre el evento `BaronCompared` con ambas cartas y audiencia `[player, target]`.
- [x] 2.3 En caso de valores distintos, eliminar al de menor valor con `eliminate()` y agregar el `PlayerEliminated` público existente; en empate, no tocar a ningún jugador ni agregar ningún evento adicional.
- [x] 2.4 Sustituir la entrada `Baron: noEffect` por `Baron: resolveBaron` en la tabla `EFFECTS`.
- [x] 2.5 Pruebas en `packages/engine/tests/effect.test.ts`: objetivo ilegal (protegido/uno mismo) rechazado, sin objetivo legal (fizzle sin cambios), quien juega pierde, el objetivo pierde, empate dejando a ambos activos con su carta, evento `BaronCompared` visible para los dos implicados con ambas cartas, invisible para un tercero, y un tercero no puede distinguir un empate de un fizzle (mismos eventos observables).

## 3. Efecto de la Sirvienta

- [x] 3.1 Implementar `resolveHandmaid` en `packages/engine/src/effect.ts`: sin target, marca `protected: true` en la entrada de quien juega vía `requireActive(state.round, player)`, `events: []`.
- [x] 3.2 Sustituir la entrada `Handmaid: noEffect` por `Handmaid: resolveHandmaid` en la tabla `EFFECTS`.
- [x] 3.3 Pruebas en `packages/engine/tests/effect.test.ts`: jugar la Sirvienta dosis el propio estado y la vista de un rival quedan `protected: true` de inmediato, sin ningún evento nuevo en el log.

## 4. Expiración de la protección en el avance de turno

- [x] 4.1 En `applyDiscard` (`packages/engine/src/command.ts`), al calcular `next` y construir `newRound`, limpiar `protected` en la entrada de `next` si la tenía — antes de fijar `turn: { stage: 'draw', player: next }`. Aplica siempre, sin importar qué carta se jugó.
- [x] 4.2 Pruebas en `packages/engine/tests/command.test.ts`: un jugador protegido sigue protegido durante el turno de un rival intermedio, y deja de estarlo exactamente cuando su propio turno vuelve a empezar (verificable vía `project(...).players` antes/después de avanzar el turno).

## 5. Ajustar fixtures existentes que asumían `noEffect`

- [x] 5.1 Extender en `command.test.ts` el filtro del test "cada personaje sin efecto implementado se descarta sin cambios adicionales" para excluir también `Baron` y `Handmaid`, y anotar en el docstring del archivo que su cobertura se movió a `effect.test.ts`.
- [x] 5.2 Ajustar en `command.test.ts` el playthrough de punta a punta ("una ronda se juega por turnos hasta vaciar el mazo") para dar un target legal cuando la carta robada sea `Baron` (además de `Guard`/`Priest`) y evitar una eliminación real que deje a un solo jugador activo — igual riesgo ya documentado y resuelto en #14 para el Guardia.

**No anticipado:** un TERCER test rompió, no listado en el riesgo de design.md (que solo mencionaba los dos de `command.test.ts`). El fizzle del Guardia en `effect.test.ts` ("sin objetivo legal, el descarte no cambia nada más") usaba a `beto` protegido como fixture para forzar "sin objetivo legal", y el turno avanza a `beto` al terminar el turno de `ana` — con la limpieza de protección nueva (tarea 4.1), su propia protección expira justo ahí, porque es el inicio de SU turno. Es el comportamiento correcto del #15, no un bug: se ajustó la aserción a `protected: false` con un comentario explicando por qué, en vez de tocar el fixture. Además, la lógica original de "evitar que el Barón elimine" en 5.2 comparaba la carta equivocada (la que ya tenía en mano en vez de la que le quedaría tras el descarte) — se corrigió calculando `remainingAfterDiscard` explícitamente y aplicando los parámetros de objetivo según la carta que realmente se descarta, no según `activePlayer.held` a ciegas (así también cubre el caso de que la carta evitada-por-Barón sea a su vez Guardia o Sacerdote).

## 6. Verificación

- [x] 6.1 `npm test --workspace packages/engine` y `npm run typecheck --workspace packages/engine` en verde.
- [x] 6.2 `npm run lint` en verde.
- [x] 6.3 `openspec validate add-baron-handmaid-effects --strict` sin errores.
