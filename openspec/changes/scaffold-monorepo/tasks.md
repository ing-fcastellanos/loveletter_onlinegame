## 1. Base de TypeScript y Node

- [x] 1.1 Crear `tsconfig.base.json` en la raíz con el conjunto estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`) más el del ADR 0005 (`module` y `moduleResolution` en `nodenext`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit`, `erasableSyntaxOnly`); verificar que `npx tsc --showConfig -p tsconfig.base.json` refleja todas las banderas.
- [x] 1.2 Corregir `engines.node` de `>=22` a `>=24` en el `package.json` de la raíz y añadir TypeScript como `devDependency`; verificar que `npm install` reinstala sin advertencias de motor.

## 2. `packages/engine` — el paquete y su frontera

- [x] 2.1 Crear `packages/engine/package.json` con el nombre `@loveletter/engine`, `"type": "module"`, **sin campo `dependencies`**, y el `exports` partido de `design.md` (`.` → `./src/client.ts`, `./server` → `./src/server.ts`); verificar que `npm install` desde la raíz crea el enlace en `node_modules/@loveletter/engine`.
- [x] 2.2 Crear `packages/engine/tsconfig.json` extendiendo la base **sin declarar `lib` de DOM ni de Node**; verificar que un uso deliberado de `document` o `process` dentro del motor falla al verificar tipos. **Desviación:** no bastó con omitir `lib`. Con `target: esnext` y sin `lib` explícito, TypeScript incluye DOM por defecto, así que `document` compilaba. Se fijó `"lib": ["esnext"]` en `tsconfig.base.json` — sin DOM por defecto, y `apps/web` lo declara. Verificado: `TS2584` para `document` y `TS2591` para `process`.
- [x] 2.3 Crear `packages/engine/src/state.ts` con `GameState`, `PlayerView` y `project` **mínimos**, con un comentario que los declara provisionales y apunta al issue #7; los imports relativos llevan extensión `.ts`.
- [x] 2.4 Crear los barriles `packages/engine/src/client.ts` (solo la superficie segura) y `packages/engine/src/server.ts` (autoridad completa); verificar que ningún barril contiene lógica, solo re-exportaciones.

## 3. `apps/web` y `services/api`

- [x] 3.1 Crear `apps/web` con Vite + TypeScript, su `tsconfig.json` con la `lib` del DOM, y `@loveletter/engine` como dependencia de workspace; verificar que `npm run build` del workspace termina sin errores.
- [x] 3.2 Hacer que `apps/web/src/main.ts` importe un símbolo de la superficie **por defecto** del motor y lo use; verificar que el servidor de desarrollo de Vite lo sirve sin ningún build previo del motor (Requirement "El motor se consume sin paso de compilación", escenario del navegador).
- [x] 3.3 Crear `services/api` con su `package.json`, su `tsconfig.json` con la `lib` del servidor, y un único módulo que importe desde `@loveletter/engine/server`; verificar ejecutándolo con `node` en un clon sin build que el import resuelve y el símbolo funciona (mismo Requirement, escenario del servidor, y Requirement "La autoridad completa vive tras un subpath explícito").

## 4. Vitest y la prueba de la frontera

- [x] 4.1 Añadir Vitest a los tres workspaces con configuración propia (`packages/engine` en entorno neutro, sin DOM) y el script `test` de la raíz que los recorre; verificar que `npm test` desde la raíz ejecuta los tres con una prueba trivial en cada uno. **Nota:** Vitest y el proveedor de cobertura se instalaron como `devDependencies` de la **raíz**, no del motor, para que su manifiesto quede sin dependencias de ningún tipo; se resuelven por hoisting.
- [x] 4.2 Confirmar que Vitest digiere los imports con extensión `.ts` y el `exports` a código fuente; **Resultado:** los digirió sin configuración adicional; no hizo falta la salida documentada en `design.md`.
- [x] 4.3 Crear el fixture de tipos negativo (un archivo que importe el estado autoritativo desde la superficie por defecto, excluido del `include` del typecheck normal); verificar a mano que `tsc` sobre él reporta `TS2305`.
- [x] 4.4 Escribir la prueba que ejecuta el compilador sobre ese fixture y **exige** que falle con `TS2305`; verificar que pasa, y que si se añade el estado autoritativo al barril de cliente la prueba se pone roja (Requirement "La superficie por defecto no expone estado oculto").
- [x] 4.5 Escribir la prueba positiva complementaria: importar la vista de jugador desde la superficie por defecto compila y es utilizable; verificar que pasa.
- [x] 4.6 Escribir la prueba que verifica que el manifiesto del motor no declara dependencias de runtime; verificar que se pone roja al añadir una dependencia cualquiera (Requirement "El motor no tiene dependencias de runtime").
- [x] 4.7 Añadir un fixture y su prueba para la sintaxis no borrable: un `enum` dentro del motor debe fallar al verificar tipos con `TS1294`; verificar que la prueba pasa (Requirement "El código del motor usa solo sintaxis borrable").
- [x] 4.8 Habilitar el reporte de cobertura sin umbral obligatorio; verificar que `npm test` lo genera. **Desviación:** al ampliar el `include` del typecheck se detectó que `apps/web` y `services/api` no verificaban sus propias pruebas ni su `vitest.config.ts`; se agregaron a su `include` para que `npm run typecheck` cubra los tres workspaces por completo.

## 5. Scripts de raíz y documentación

- [x] 5.1 Añadir los scripts `test` y `typecheck` a la raíz recorriendo los tres workspaces; verificar que ambos pasan desde un `git clean` seguido de `npm install`.
- [x] 5.2 Actualizar la sección "Cosas que no existen todavía" de `CLAUDE.md` retirando lo que este change crea, y confirmar que los comandos de "Día a día" son los reales; verificar que no queda ninguna afirmación falsa en ese archivo (regla anti-deriva).
- [x] 5.3 Actualizar el "Estado" de `README.md` para reflejar que la Fase 0 tiene código; verificar que la tabla de fases sigue siendo correcta.

## 6. Verificación

- [x] 6.1 En un clon limpio del repositorio: `npm install`, `npm run typecheck` y `npm test` pasan sin ningún paso intermedio; pegar la salida real de los tres comandos.
- [x] 6.2 Confirmar contra los cinco Requirements de `specs/engine-package/spec.md` que cada escenario tiene una prueba o una verificación manual documentada, y anotar cuál cubre a cuál.
- [x] 6.3 Confirmar que ningún módulo de `apps/web` importa desde `@loveletter/engine/server` (Requirement "La autoridad completa vive tras un subpath explícito", segundo escenario); pegar la salida de la búsqueda.
- [x] 6.4 Cerrar registrando las desviaciones del plan que hayan ocurrido y `openspec validate scaffold-monorepo --strict` en verde.

### Evidencia

**6.1 — Clon limpio** (`git clone -b chore/scaffolding-monorepo` a un directorio nuevo):

```
$ npm install
found 0 vulnerabilities

$ npm run typecheck
> @loveletter/engine@0.0.0 typecheck   (tsconfig.json && tsconfig.test.json)
> @loveletter/web@0.0.0 typecheck
> @loveletter/api@0.0.0 typecheck
(sin errores)

$ npm test
 Test Files  2 passed (2)   Tests  6 passed (6)   # packages/engine
 Test Files  1 passed (1)   Tests  1 passed (1)   # apps/web
 Test Files  1 passed (1)   Tests  1 passed (1)   # services/api
```

Ningún paso intermedio: no se compiló el motor en ningún momento.

**6.2 — Cobertura de los Requirements de `specs/engine-package/spec.md`:**

| Requirement · Scenario | Verificado por |
|---|---|
| Se consume sin build · servidor | `node services/api/src/main.ts` en clon limpio imprime la proyección |
| Se consume sin build · navegador | El dev server de Vite sirve `main.ts` resolviendo el import a `packages/engine/src/client.ts`; `vite build` produce el bundle |
| Superficie por defecto no expone estado oculto · inalcanzable | `tests/boundary.test.ts` — ejecuta el compilador sobre `fixtures/forbidden-import.ts` y exige `TS2305` |
| Superficie por defecto no expone estado oculto · vista alcanzable | `tests/contract.test.ts` — usa `PlayerView` y `CARD` desde el default |
| Autoridad tras subpath · servidor accede | `services/api/tests/engine-surface.test.ts` y `tests/contract.test.ts` |
| Autoridad tras subpath · cliente no la usa | Tarea 6.3 |
| Sin dependencias de runtime · manifiesto | `tests/contract.test.ts` — lee `package.json` y exige `dependencies` vacío |
| Sin dependencias de runtime · sin APIs de entorno | `packages/engine/tsconfig.json` con `lib: [esnext]` y `types: []`; verificado a mano: `TS2584` para `document`, `TS2591` para `process` |
| Solo sintaxis borrable · se rechaza al verificar tipos | `tests/boundary.test.ts` — exige `TS1294` sobre `fixtures/non-erasable.ts` |
| Solo sintaxis borrable · valores del dominio sin construcciones no borrables | `packages/engine/src/cards.ts` — objeto `as const` con uniones literales |

**Pruebas de mutación** (que las pruebas se pongan rojas cuando deben):

- Re-exportar `GameState` desde `src/client.ts` → `boundary.test.ts` falla. Revertido.
- Añadir una `dependencies` cualquiera al motor → `contract.test.ts` falla. Revertido.

**6.3 — Imports de `apps/web`:**

```
apps/web/src/main.ts:11:                 import { CARD } from '@loveletter/engine';
apps/web/tests/engine-surface.test.ts:9: import { CARD } from '@loveletter/engine';
```

Ninguno usa `@loveletter/engine/server`.

**6.4 — Desviaciones registradas:** tareas 2.2 (el `lib` por defecto incluía DOM), 4.1 (Vitest en la raíz para no ensuciar el manifiesto del motor), 4.2 (sin desviación: Vitest digirió los imports `.ts`) y 4.8 (`web` y `api` no verificaban sus pruebas). `openspec validate scaffold-monorepo --strict`: **valid**.
