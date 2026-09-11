## Why

El motor todavía no tiene vocabulario: `state.ts` y `cards.ts` son marcadores de la Fase 0 que existen solo para sostener la frontera del `exports`. Todo lo que viene en las Fases 1 y 2 —barajado, setup, turno, los ocho efectos— se escribe **sobre** este modelo, así que su precisión se paga sola o se cobra en cada regla que venga después.

El issue #7 fija el criterio: _un estado imposible no se puede construir sin que el compilador se queje_. La exploración midió que el modelo más obvio —una mano de 1 o 2 cartas por jugador— rechaza manos de 0 y de 3 cartas, pero **acepta que un jugador fuera de turno sostenga dos**. Este change adopta el modelo que también cierra ese hueco.

## What Changes

- **Los ocho personajes con su valor** dejan de ser provisionales: `CARD`, `CardName` y `CardValue` se formalizan en `cards.ts`.
- **Dos capas de estado**, porque tienen ciclos de vida distintos:
  - **Partida** — `Player { id, name, tokens }`. Persiste entre rondas.
  - **Ronda** — mazo, carta apartada, cartas descubiertas, jugadores de ronda y turno. Se construye desde cero en cada ronda: es imposible arrastrar estado de la ronda anterior o perder fichas por descuido, porque las fichas no viven ahí.
- **Cada jugador activo sostiene exactamente una carta.** La carta robada no vive en la mano sino en el **turno**, una máquina de estados explícita: `draw` (aún no ha robado) → `play` (ya robó y debe descartar). Dos cartas solo existen para el jugador en turno y solo en la fase `play`.
- **La mano de dos cartas sigue existiendo como vista derivada**: el tipo `Hand = readonly [C] | readonly [C, C]` y un accesor puro que la calcula a partir del jugador y del turno.
- **El jugador de ronda es una unión discriminada**: `active` sostiene carta, descartes y protección de Sirvienta; `eliminated` no tiene carta —el campo no existe— pero **conserva sus descartes**, porque siguen sobre la mesa y alimentan la deducción.
- **Las cartas descubiertas** de la partida a dos son exactamente cero o exactamente tres, no un arreglo de cualquier longitud.
- **`Result` y `RuleViolation`**: una jugada ilegal es un valor de retorno, nunca una excepción. La violación es estructurada —un código y los datos del caso—, sin texto libre, para que la presentación la traduzca al español en su capa.
- **Todo el estado es inmutable** en el tipo, a todas las profundidades.
- **Contratos de tipo verificados en `npm run typecheck`**: cada estado imposible queda escrito como una construcción que el compilador debe rechazar.
- `project` y `Command` siguen siendo marcadores, pero se mudan a sus propios módulos y se adaptan a la forma nueva del estado.
- **ADR 0007** registra el modelo, y la documentación corrige de paso dos derivas previas: `@ll/engine` en lugar de `@loveletter/engine`, y "Node 22" donde el repositorio exige Node 24.
- **BREAKING**: la forma de `GameState` cambia. Solo lo consumen `services/api` (esqueleto) y las pruebas del motor; se actualizan en el mismo change.

## Non-goals

- **Construir el mazo y barajarlo** (issue #8): aquí `deck` es un tipo, no un algoritmo. La semilla conserva su nombre provisional; el #8 decide si el PRNG necesita un estado más rico.
- **Preparar una ronda** (issue #9): no hay constructor del estado inicial. Las pruebas construyen estados a mano.
- **El contenido de `PlayerView`** (issue #10): sigue exponiendo solo el conteo del mazo. El modelo nuevo añade información oculta —la carta de cada rival, la robada, el orden del mazo— y ninguna llega a la vista.
- **Eventos** (issue #11) y **transiciones del turno** (issue #12): el tipo del turno existe, pero ninguna operación lo hace avanzar.
- **Estados terminales** de ronda y de partida (issues #20 y #21): quedan como punto de extensión documentado, no se modelan aquí.
- **Comprobación en runtime de lo que el tipo no puede expresar** —conservación de las 16 cartas, integridad referencial de identificadores— (issue #22): se enumera en el design para que conste qué garantiza el compilador y qué no.
- **Códigos de violación** más allá de los dos fundamentales: cada regla de la Fase 2 añade el suyo.

## Capabilities

### New Capabilities

- `game-state`: qué puede representar el estado de una partida y, sobre todo, qué no puede — los ocho personajes, las dos capas partida/ronda, la carta única del jugador activo, el turno como máquina de estados, la eliminación, las cartas descubiertas, la inmutabilidad y las jugadas ilegales como valores.

### Modified Capabilities

(ninguna — `engine-package` ya exige que la superficie por defecto no alcance ningún tipo con información oculta; los tipos nuevos de ronda quedan del lado de autoridad y sus pruebas de frontera se amplían, sin cambiar el requisito)

## Impact

- **`packages/engine/src/`**: `cards.ts` formalizado; `state.ts` reescrito; nuevos `result.ts`, `violation.ts`, `view.ts` y `command.ts`; barriles `client.ts` y `server.ts` actualizados.
- **`packages/engine/tests/`**: archivo de contratos de tipo, pruebas de runtime del modelo, fixture de frontera ampliado y prueba de contrato adaptada.
- **`services/api/`**: `src/main.ts` y su prueba construyen el estado con la forma nueva.
- **Documentación**: ADR 0007, `docs/decisions/_index.md`, `CLAUDE.md`, `openspec/config.yaml` y `README.md`.
