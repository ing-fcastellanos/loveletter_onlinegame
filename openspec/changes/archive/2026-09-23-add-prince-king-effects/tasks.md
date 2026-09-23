## 1. Efecto del Rey

- [x] 1.1 Implementar `resolveKing` en `packages/engine/src/effect.ts`: reutiliza `resolveTarget`/`legalTargets` sin modificarlas; fizzle (`ok({state, events: []})`) si no hay objetivo legal.
- [x] 1.2 Con objetivo resuelto, intercambiar `held` entre `self` (post-descarte, vía `requireActive(state.round, player)`) y `target` directamente; sin tocar `discards`, sin evento nuevo.
- [x] 1.3 Sustituir la entrada `King: noEffect` por `King: resolveKing` en la tabla `EFFECTS`.
- [x] 1.4 Pruebas en `packages/engine/tests/effect.test.ts`: objetivo ilegal (protegido/uno mismo) rechazado, sin objetivo legal (fizzle sin cambios), el intercambio deja a cada quien con la carta del otro, cada vista propia refleja su nueva carta, y ningún tercero ve ninguna de las dos manos.

## 2. Objetivo propio del Príncipe

- [x] 2.1 Implementar `legalTargetsForPrince(round, self)` en `packages/engine/src/effect.ts`: incluye siempre a `self`, más cualquier otro activo no protegido.
- [x] 2.2 Implementar `resolvePrinceTarget(round, player, target)`: `MissingTarget` si se omite el objetivo (nunca hay fizzle, `legalTargetsForPrince` nunca es vacío), `IllegalTarget` si no está en la lista, si no devuelve el `ActivePlayer` resuelto (puede ser `self`).
- [x] 2.3 Pruebas en `effect.test.ts`: apuntarse a uno mismo es legal aunque haya otros objetivos disponibles; omitir el objetivo se rechaza; apuntar a un rival protegido se rechaza; con todos los rivales protegidos, apuntar al único rival se rechaza y apuntarse a uno mismo se acepta.

## 3. Efecto del Príncipe: descarta y roba

- [x] 3.1 Implementar `resolvePrince` en `packages/engine/src/effect.ts` usando `resolvePrinceTarget`. Con el objetivo resuelto (post-descarte de quien juega, vía el estado que ya recibe el efecto), registrar el `CardDiscarded` público de su carta forzada (`player: target.id`).
- [x] 3.2 Si la carta forzada es `'Princess'`: eliminar al objetivo con `eliminate()`, agregar el `PlayerEliminated` público existente, y NO robar ninguna carta.
- [x] 3.3 Si no: el objetivo roba `round.deck[0]` si el mazo tiene cartas, o `round.setAside` si está vacío; registrar el `CardDrawn` restringido a `[target.id]` con la carta robada. No disparar `EFFECTS[cartaForzada]` — el descarte forzado nunca resuelve el efecto de la carta que salió.
- [x] 3.4 Sustituir la entrada `Prince: noEffect` por `Prince: resolvePrince` en la tabla `EFFECTS`.
- [x] 3.5 Pruebas en `effect.test.ts`: el objetivo termina con una carta nueva del mazo; la carta forzada (p. ej. un Guardia) no dispara su propio efecto; con el mazo vacío el objetivo recibe la carta apartada; forzar la Princesa elimina al objetivo sin que robe nada; un Príncipe apuntado a uno mismo funciona igual que a un rival (sin caso especial).

## 4. Ajustar fixtures existentes que asumían `noEffect`

- [x] 4.1 Extender en `command.test.ts` el filtro del test "cada personaje sin efecto implementado se descarta sin cambios adicionales" para excluir también `Prince` y `King`.
- [x] 4.2 Ajustar en `command.test.ts` el playthrough de punta a punta para dar parámetros válidos cuando la carta robada sea `Prince` (target legal, posiblemente uno mismo) o `King` (target legal). No hizo falta evitar la eliminación por Princesa forzada: confirmado que el patrón de "el ganador se sigue jugando a sí mismo" (aceptado en #14/#15) tampoco se cae con el Príncipe — el playthrough pasó a la primera sin necesitar esa evitación.

**No anticipado:** las pruebas genéricas de `command.test.ts` heredadas de #12/#13 (turno-ciclo, no específicas de ninguna carta) usaban `active('ana', 'King')` como la carta arbitraria en mano de ana — un total de 16 ocurrencias en 9 tests distintos. Al volverse real `EFFECTS.King`, todas empezaron a rechazarse con `MissingTarget`. Esto es más amplio que el riesgo ya anotado en design.md (que solo cubría el loop de "sin efecto" y el playthrough). Se resolvió reemplazando esa carta de relleno por `'Countess'` (todavía `noEffect`) en todo el archivo — ningún test de este archivo probaba el comportamiento propio del Rey, esa cobertura vive en `effect.test.ts`.

**No anticipado (bug real detectado y corregido antes de mergear):** la primera versión de `resolvePrince` sumaba la carta forzada a `discards` manualmente y LUEGO llamaba a `eliminate()` en el caso de la Princesa — pero `eliminate()` ya suma `player.held` a `player.discards` por su cuenta, así que la Princesa forzada quedaba duplicada en la lista de descartes (`['Princess', 'Princess']`). Corregido llamando a `eliminate(target)` directamente (sin el paso intermedio de discards) en esa rama, dejando el paso manual de discards solo en la rama que sí roba una carta nueva.

## 5. Verificación

- [x] 5.1 `npm test --workspace packages/engine` y `npm run typecheck --workspace packages/engine` en verde.
- [x] 5.2 `npm run lint` en verde.
- [x] 5.3 `openspec validate add-prince-king-effects --strict` sin errores.
