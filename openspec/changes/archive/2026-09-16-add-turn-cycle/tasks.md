## 1. Tipos

- [x] 1.1 Agregar el brazo `Discard` a `Command` en `command.ts` (`{ type: 'Discard'; playerId; card: CardName }`), según design.md — `Command.Discard` apunta por valor de carta. Verificar con `npm run typecheck --workspace packages/engine`.
- [x] 1.2 Agregar `AlreadyDrew`, `MustDrawFirst` y `DeckEmpty` a `RuleViolation` en `violation.ts`. Verificar que compila.

## 2. `applyCommand` — robar

- [x] 2.1 Implementar el caso `Draw` de `applyCommand` en `command.ts`: valida `NotYourTurn` → `AlreadyDrew` → `DeckEmpty`, en ese orden; mueve la carta superior del mazo a `turn.drawn` sin alterar el resto del mazo ni otras manos; produce el evento `CardDrawn` restringido a quien robó. Cubre "Solo el jugador del turno puede actuar" (mitad de robar), "Robar exige estar en la fase de robar", "Robar exige que el mazo no esté vacío", "Robar mueve la carta superior del mazo a la mano del jugador" y la mitad de robar de "Cada comando produce sus eventos con la audiencia correcta", de `specs/turn-cycle/spec.md`, con prueba unitaria por caso en `packages/engine/tests/command.test.ts` (nuevo archivo).

## 3. `applyCommand` — descartar

- [x] 3.1 Implementar el caso `Discard`: valida `NotYourTurn` → `MustDrawFirst` → `CardNotInHand`, en ese orden; mueve la carta elegida a los descartes del jugador, deja la otra como su única carta en mano, y produce `CardDiscarded`. Cubre "Solo el jugador del turno puede actuar" (mitad de descartar), "Descartar exige haber robado", "Descartar exige tener la carta en mano", "Descartar dispensa la carta elegida y conserva la otra" y la mitad de descartar de "Cada comando produce sus eventos con la audiencia correcta", con prueba unitaria por caso en `command.test.ts`.
- [x] 3.2 Implementar `nextActivePlayer` (recorrido circular en orden de asiento desde quien descartó, primer `status: 'active'`) y usarlo para avanzar `turn` a `{ stage: 'draw', player: siguiente }`, produciendo también `TurnChanged`. Cubre "Descartar avanza el turno al siguiente jugador activo" (las dos escenarios, incluido saltar un eliminado — con una ronda armada a mano, según design.md — Risks) y la segunda mitad de "Cada comando produce sus eventos con la audiencia correcta", en `command.test.ts`.

## 4. Superficie e inmutabilidad

- [x] 4.1 Exportar `applyCommand` desde `server.ts` (superficie de autoridad, ADR 0004). `Command` ya se exporta desde ambas superficies; no cambia.

  **Desviación:** no anticipado en tasks.md — `applyCommand` también se agregó a la lista `AUTHORITY_ONLY` de `boundary.test.ts` y al fixture `forbidden-import.ts`, para que la frontera del ADR 0005 lo cubra igual que a `startMatch`/`dealRound`. Sin este paso, nada probaba que la superficie segura lo rechaza.

- [x] 4.2 Prueba unitaria de que el estado recibido por `applyCommand` no se modifica (comparar por valor antes/después de un comando válido). Cubre "El estado nunca se modifica en sitio" en `command.test.ts`.

## 5. Integración

- [x] 5.1 Prueba de integración: partida de `startMatch`, jugada completa por turnos (robar y descartar alternando, eligiendo una carta válida en cada descarte) hasta que el mazo restante queda vacío, sin ningún comando rechazado. Cubre "Una ronda se juega por turnos hasta vaciar el mazo" en `command.test.ts`.

## 6. Documentación

- [x] 6.1 Actualizar `CLAUDE.md` — sección "Cosas que no existen todavía": el ciclo de turno ya existe (issue #12, cierra el Hito 1); precisar que sigue sin efectos de carta (Fase 2) ni fin de ronda (#19).

## Verificación

Clon limpio (`git clone --branch feat/turn-cycle` + `npm install`):

- `npm run typecheck` (los tres workspaces): PASS.
- `npm test` (raíz, los tres workspaces): PASS — engine 7 archivos/89 pruebas, web 1, api 2.
- `npm run lint`: PASS.
- `npm run format:check`: PASS.
