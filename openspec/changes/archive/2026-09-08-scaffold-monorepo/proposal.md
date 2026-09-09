## Why

El repositorio tiene proceso, decisiones y tablero, pero ni una línea de código. Los ADR [0002](../../../docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md), [0003](../../../docs/decisions/0003-stack-typescript-cliente-y-servidor.md) y [0005](../../../docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md) ya decidieron la forma del monorepo, el stack y el contrato del paquete del motor; falta materializarlos. Este change es el punto de entrada del camino crítico: los issues #1, #2 y #3 bloquean a todos los demás.

Van juntos porque el ADR 0005 los fusionó. El criterio de éxito de #1 (`npm run typecheck` pasa en los tres workspaces) depende de la configuración de #2, cuyo contenido exacto ya quedó fijado en ese ADR; y la frontera de `exports` que #1 introduce solo se puede *demostrar* con el runner de #3.

## What Changes

- **`packages/engine`** con `package.json` propio, **cero dependencias de runtime**, sin DOM ni APIs de Node. Se distribuye como código fuente: su `exports` apunta a los `.ts` de `src/`, sin paso de compilación.
- **`exports` partido, con el default del lado seguro**: `.` expone la superficie de cliente (`PlayerView`, `Command`, `legalMoves`) y `./server` expone la autoridad completa (`GameState`, `applyCommand`, `project`). Alcanzar `GameState` desde la superficie segura pasa a ser un error de compilación.
- **`apps/web`** con Vite + TypeScript, dependiendo de `packages/engine` por nombre de workspace e importando **solo** la superficie segura.
- **`services/api`** esqueletado: estructura y `package.json`, con el mínimo de código necesario para que `tsc` no falle por ausencia de archivos de entrada. Fastify, WebSocket y PostgreSQL llegan en la Fase 4.
- **Configuración de TypeScript estricta y compartida** (issue #2): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, más el conjunto que exige el ADR 0005: `module`/`moduleResolution` en `nodenext`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit` y `erasableSyntaxOnly`.
- **Vitest** (issue #3) en los tres workspaces, ejecutable desde la raíz, con reporte de cobertura sin umbral obligatorio todavía.
- **Scripts de raíz** `test` y `typecheck` que recorren los workspaces.
- **BREAKING**: ninguno — el repositorio no tiene código que romper.

## Non-goals

- **Reglas del juego**: ni una. Los tipos del dominio, el mazo, el barajado y el ciclo de turno son la Fase 1 (issues #7–#12). Aquí los símbolos que se exporten son mínimos y existen solo para probar que la frontera del `exports` funciona.
- **Interfaz de usuario**: `apps/web` queda como un punto de entrada que importa del motor y compila. La UI real es la Fase 3.
- **Servidor y base de datos**: `services/api` queda esqueletado. Fastify, WebSocket y PostgreSQL son la Fase 4.
- **ESLint y sus reglas de invariantes** (issue #4) y **CI con PR gates** (issue #5): quedan fuera. Este change deja los comandos que esos issues van a orquestar, no los orquesta.
- **Umbral de cobertura**: se habilita el reporte, no se impone un mínimo.

## Capabilities

### New Capabilities
- `engine-package`: el contrato del paquete del motor — cómo se distribuye (código fuente, sin build), qué superficie publica cada subpath de `exports`, qué información no puede alcanzarse desde la superficie de cliente, y qué sintaxis de TypeScript queda prohibida para que el fuente sea ejecutable directamente.

### Modified Capabilities
(ninguna — es el primer código del repositorio)

## Impact

- **Estructura**: nacen `packages/engine`, `apps/web` y `services/api` como workspaces; el `package.json` de la raíz ya los declara.
- **Dependencias**: se añaden como `devDependencies` TypeScript, Vitest y Vite. `packages/engine` no recibe **ninguna** dependencia de runtime, y esa ausencia es parte de su contrato.
- **Comandos**: `npm test` y `npm run typecheck` desde la raíz pasan a recorrer los tres workspaces. Son los que consumirán el CI del issue #5 y los hooks existentes.
- **Documentación**: `CLAUDE.md` pierde la nota de "no hay motor todavía" en lo que corresponda, y gana los comandos reales una vez que existan.
- **Runtime**: el proyecto queda atado a Node ≥ 23 por el type-stripping (ADR 0005). `engines` en los `package.json` debe reflejarlo.
