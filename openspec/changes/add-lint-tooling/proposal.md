## Why

Dos invariantes del proyecto viven hoy solo en prosa. La frontera de `GameState` ya la impone el `exports` y la verifica una prueba ([ADR 0005](../../../docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md)), pero la prohibición de `Math.random()` en el motor ([ADR 0004](../../../docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md)) **no la vigila nada**: hoy se puede introducir sin que falle una sola verificación. Es la invariante de la que depende todo el determinismo del motor —tests reproducibles, replays, re-verificación del servidor— y es la más fácil de romper por descuido.

El issue #4 daba por sentado ESLint. La exploración midió que no es viable con TypeScript 7, y el [ADR 0006](../../../docs/decisions/0006-linter-y-formateador-oxlint-prettier.md) decidió oxlint + Prettier en su lugar.

## What Changes

- **oxlint** en la raíz, con las tres reglas acotadas por directorio mediante `overrides`:
  - `no-restricted-properties` prohibiendo `Math.random` dentro de `packages/engine`.
  - `no-restricted-imports` prohibiendo `@loveletter/engine/server` dentro de `apps/web`.
  - `no-console` fuera de código de prueba.
  - Cada mensaje cita el ADR que origina la regla, para que quien la encuentre sepa por qué existe.
- **Prettier** en la raíz con una configuración única para los tres workspaces.
- **Scripts de raíz** `lint` y `format` (más `format:check`, que es el que consumirá el CI del issue #5).
- **Requisito nuevo en la capability `engine-package`**: el motor no consume aleatoriedad ambiental. Existía como decisión en el ADR 0004 y como prosa en `CLAUDE.md`, pero no como contrato verificable.
- **Formateo inicial del código existente**, en un commit propio y separado del resto para que el diff de sustancia siga siendo legible.
- **BREAKING**: ninguno.

## Non-goals

- **CI y PR gates** (issue #5): este change deja los comandos `lint` y `format:check` listos para que el workflow los invoque, pero no crea el workflow. Son changes separados a propósito: el lint aporta valor en la máquina de quien desarrolla aunque el CI todavía no exista.
- **El PRNG sembrado y el barajado determinista** (issue #8): aquí solo se prohíbe la fuente ambiental de aleatoriedad. Construir la alternativa inyectada es la Fase 1.
- **Reglas con información de tipos**: oxlint no las ofrece y ninguna invariante actual las necesita. El trade-off está registrado en el ADR 0006.
- **Regla que prohíba el _tipo_ `GameState` en la UI**: el `exports` partido ya lo hace imposible en compilación y una prueba lo verifica. La regla de este change prohíbe el **especificador** `@loveletter/engine/server`, que es la puerta por la que se podría entrar, y es explícitamente segunda línea de defensa.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `engine-package`: se añade el requisito de que el motor no consume aleatoriedad ambiental. Es un contrato de comportamiento del paquete que hasta ahora solo existía en el ADR 0004.

## Impact

- **Raíz**: `.oxlintrc.json`, `.prettierrc`, `.prettierignore` nuevos; `oxlint` y `prettier` como `devDependencies`; scripts `lint`, `format` y `format:check`.
- **Los tres workspaces**: reformateo del código existente. Sin cambios de comportamiento.
- **`openspec/specs/engine-package/spec.md`**: un requisito más al archivar.
- **Documentación**: `CLAUDE.md` gana los comandos reales de lint y formato y pierde la mención a que no existen.
- **Issue #5**: hereda `lint` y `format:check` como los comandos que su workflow va a ejecutar.
