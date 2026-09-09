# ROADMAP — Love Letter en línea

> Última actualización: 2026-09-08. Cada fase es un **milestone de GitHub**; cada issue lleva milestone + labels (`type:`, `area:`, `priority:`). Regla: al cerrar o replanear una fase, actualizar este archivo en el mismo PR.

Las fases 1 a 4 son los cuatro hitos del PDD. Se antepone una **Fase 0** porque el repo tiene que existir y ser verificable antes de que haya motor que verificar.

El orden responde a una dependencia dura: el **motor** es el centro y todo lo demás lo consume. La UI no se construye sobre reglas a medias, y el servidor no se construye sobre un motor que la UI todavía puede estar deformando.

## Fase 0 — Fundaciones

Repo operativo de punta a punta: monorepo con npm workspaces (ADR 0002), `packages/engine`, `apps/web` y `services/api` esqueletados con TypeScript estricto, Vitest corriendo, y CI que valida en cada PR. Tooling de convenciones (husky, commitlint) y el tablero de GitHub poblado. Sale de aquí un repo donde `npm test` pasa y un PR queda en verde — sin una sola regla de juego implementada.

## Fase 1 — Modelado de datos y core engine (Hito 1)

El vocabulario del dominio y una partida que avanza. Tipos precisos para `Card`, `Player` y `GameState`; el mazo de 16 cartas con sus multiplicidades; barajado determinista con PRNG sembrado (ADR 0004); el setup completo, incluida la carta apartada y las 3 descubiertas de la partida a dos. El ciclo de turno robar → descartar itera entre jugadores **sin aplicar efectos todavía**, y `project(state, playerId)` ya devuelve `PlayerView` desde el primer día.

Al cerrar: se puede jugar una partida entera de cartas sin poderes, y ningún dato oculto es alcanzable desde una `PlayerView`.

## Fase 2 — Motor de resolución de efectos y reglas (Hito 2)

Aquí el juego se vuelve Love Letter. Los efectos de las 8 cartas: la deducción del Guardia, la mirada del Sacerdote, la comparación del Barón, la inmunidad de la Sirvienta, el descarte forzado del Príncipe, el intercambio del Rey, la obligación de la Condesa y la autoeliminación de la Princesa.

Validadores previos a la jugada: la restricción ineludible de la Condesa con Rey o Príncipe en mano, objetivos ilegales (eliminados, protegidos por Sirvienta, uno mismo cuando no aplica), el Guardia que no puede adivinar "Guardia", y el caso sin escapatoria en que todos los rivales están protegidos.

Condiciones de victoria: mazo vacío al terminar un turno (gana la mano más alta, desempate por suma de descartes) o último en pie; y sobre eso, la partida por fichas de afecto (7 / 5 / 4 según 2 / 3 / 4 jugadores).

Al cerrar: el motor juega Love Letter completo y correcto, con las reglas cubiertas por pruebas — todavía sin una sola línea de interfaz.

## Fase 3 — Interfaz gráfica y persistencia de sesión (Hito 3)

Conectar el motor a un navegador. Prototipo y ADR de la técnica de render (DOM vs Canvas), una interfaz que **escucha eventos** en vez de difear estados, y controles para seleccionar una carta de la mano y apuntar a objetivos válidos — donde la validez la dicta el motor, no la UI.

Autoguardado del estado serializado en `localStorage` con `schemaVersion`, de modo que recargar la pestaña continúe exactamente donde se dejó. Ese versionado es el ensayo del problema de migraciones de la Fase 4.

Al cerrar: una persona juega una partida completa contra sí misma en el navegador, recarga a media partida y no pierde nada.

## Fase 4 — Backend y preparación para multijugador (Hito 4)

Transición a cliente-servidor con **servidor autoritativo**: los comandos se procesan de forma asíncrona, el servidor los valida con el mismo motor y devuelve a cada cliente solo su `PlayerView`. Se simula latencia de red para que el cliente no asuma respuesta inmediata.

Infraestructura de datos en PostgreSQL: perfiles, lobbies e histórico de partidas. Y el requisito explícito del PDD — una **estrategia de versionado de esquemas** que prevenga colisiones de versiones entre ramas y entornos, decidida por spike y registrada en su ADR.

Al cerrar: dos navegadores distintos juegan la misma partida contra un servidor que no confía en ninguno de los dos.

---

## Decisiones ya registradas

| ADR | Decisión |
|---|---|
| [0001](docs/decisions/0001-proceso-openspec-adrs-github.md) | Proceso: OpenSpec + ADRs + GitHub |
| [0002](docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md) | Monorepo con npm workspaces y motor compartido |
| [0003](docs/decisions/0003-stack-typescript-cliente-y-servidor.md) | Stack TypeScript en cliente y servidor |
| [0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) | Estado autoritativo, proyecciones y determinismo |

## Fuera de alcance (por ahora)

No están en ninguna fase y no se asumen: bots o IA rival, ranking o emparejamiento, chat en partida, cuentas con contraseña u OAuth, app móvil nativa, la edición 2019 de 21 cartas y sus personajes extra, y arte propio más allá de lo mínimo legible. Cualquiera de estos entra con su propio issue y, si toca arquitectura, su ADR.
