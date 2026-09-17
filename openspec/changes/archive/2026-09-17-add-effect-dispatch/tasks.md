## 1. Contrato y tabla de despacho

- [x] 1.1 Crear `packages/engine/src/effect.ts` con `EffectParams`, `EffectResult`, `EffectHandler`, `noEffect` y `EFFECTS` (`as const satisfies Record<CardName, EffectHandler>`, las ocho entradas apuntando a `noEffect`), según design.md — Decisiones. Verificar con `npm run typecheck --workspace packages/engine`.
- [x] 1.2 Prueba de tipo: quitar una entrada de `EFFECTS` (o agregar un personaje ficticio a un `Record<CardName, EffectHandler>` de prueba) deja de compilar. Cubre "Cada personaje tiene una entrada de efecto declarada" (la mitad de tipo) de `specs/effect-dispatch/spec.md`, como contrato negativo (`@ts-expect-error`) en el archivo de tipos que corresponda, siguiendo el patrón de `game-state.types.ts`.

  **Desviación:** no se creó un archivo `.types.ts` separado. `EFFECTS`/`EffectHandler` no se exportan desde `server.ts` (decisión de design.md), y todo `.types.ts` existente importa exclusivamente vía `@loveletter/engine`/`@loveletter/engine/server` — nunca con ruta relativa a `src/` — así que un contrato negativo ahí no podría nombrarlos. La exhaustividad ya la exige `as const satisfies Record<CardName, EffectHandler>` en el sitio de declaración: si faltara una clave, `effect.ts` mismo no compilaría. Es el mismo criterio que ya usa `DECK_COMPOSITION` en `cards.ts`, que tampoco tiene una prueba de tipo dedicada en otro archivo — la garantía vive en la propia declaración.

- [x] 1.3 Prueba unitaria: cada uno de los ocho personajes tiene una entrada en `EFFECTS`, y resolver cualquiera de ellas no cambia el estado ni agrega eventos. Cubre "Cada personaje tiene una entrada de efecto declarada" (la mitad de runtime) y "Un efecto no implementado es un resultado explícito" en `packages/engine/tests/command.test.ts`.

  **Desviación:** no se creó `effect.test.ts`. Por la misma razón de la 1.2 (`EFFECTS` no es público), la prueba ejercita las ocho entradas indirectamente a través de `applyCommand` con un `Discard` de cada personaje — que es exactamente lo que un consumidor real puede observar, y ya vive en `command.test.ts` junto a las demás pruebas de descarte.

## 2. `Command.Discard` acepta parámetros de efecto

- [x] 2.1 Agregar `target?: PlayerId` y `guess?: CardName` a `Command.Discard` en `command.ts`. Verificar que compila.

## 3. `applyDiscard` despacha al efecto

- [x] 3.1 Reordenar `applyDiscard`: descartar la carta (igual que #12) → `EFFECTS[card](estado, jugador, { target, guess })` → si falla, propagar el rechazo; si tiene éxito, tomar su estado → siguiente jugador activo calculado sobre ese estado → avanzar turno. Cubre "El efecto de la carta se resuelve como parte del descarte" de `specs/turn-cycle/spec.md` (delta), con prueba unitaria en `packages/engine/tests/command.test.ts`.
- [x] 3.2 Prueba unitaria: descartar con y sin `target`/`guess` se acepta igual, y el resultado (eventos, estado) es el mismo que sin ellos. Cubre "Descartar acepta los parámetros del efecto de la carta" en `command.test.ts`.
- [x] 3.3 Verificado: las 16 pruebas existentes de `command.test.ts` (#12) pasan sin modificarlas — el reordenamiento no cambió ningún resultado observable con `noEffect`.

## 4. Documentación

- [x] 4.1 Actualizar `CLAUDE.md` — sección "Cosas que no existen todavía": el contrato y la tabla de despacho de efectos existen (issue #13); las ocho cartas siguen sin comportamiento real (issues #14–#17).

## Verificación

Clon limpio (`git clone --branch feat/effect-dispatch` + `npm install`):

- `npm run typecheck` (los tres workspaces): PASS.
- `npm test` (raíz, los tres workspaces): PASS — engine 7 archivos/92 pruebas, web 1, api 2.
- `npm run lint`: PASS.
- `npm run format:check`: PASS.
