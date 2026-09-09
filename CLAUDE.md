# CLAUDE.md

Guía para Claude (y otros agentes IA) trabajando en este repositorio.

## Identidad del proyecto

**Love Letter en línea** — implementación digital del juego de mesa de Seiji Kanai, edición clásica (16 cartas, 2–4 jugadores).

Es un **proyecto de entrenamiento**, no un producto. El objetivo declarado en el PDD no es la fidelidad gráfica sino demostrar arquitectura de gameplay: máquinas de estado, orientación a eventos, estado inmutable y TypeScript estricto. No es comercial y no está afiliado a los editores del juego. **El proceso es parte del entregable**: un cambio bien especificado y bien decidido vale aquí tanto como el código que produce.

Monorepo con npm workspaces ([ADR 0002](docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md)):

- `packages/engine` — el motor de reglas. Corre igual en navegador y en servidor.
- `apps/web` — cliente en navegador (Fase 3). Solo presentación e input.
- `services/api` — servidor autoritativo + PostgreSQL (Fase 4).

Las convenciones de proceso se heredan del repo hermano **strategojuegos** (`/home/frank/sourcecode/strategojuegos`). Cuando dudes de un patrón de proceso (ADRs, issues, hooks, plantillas), mira cómo lo resuelve ese repo antes de inventar uno. Las decisiones **técnicas**, en cambio, son propias de aquí y a veces lo contradicen a propósito — ver ADR 0002 y ADR 0003.

## Dominio — lo que cualquier agente debe saber antes de tocar el motor

Edición clásica, 16 cartas. **No** confundir con la edición 2019 (21 cartas, hasta 6 jugadores, personajes extra) — está fuera de alcance.

| #   | Carta     | Copias | Efecto                                                                                  |
| --- | --------- | ------ | --------------------------------------------------------------------------------------- |
| 1   | Guardia   | 5      | Nombra una carta que no sea Guardia y apunta a un jugador; si aciertas, queda eliminado |
| 2   | Sacerdote | 2      | Miras la mano de otro jugador                                                           |
| 3   | Barón     | 2      | Comparan manos en privado; el de menor valor queda eliminado (empate: nadie)            |
| 4   | Sirvienta | 2      | Inmune a efectos hasta tu siguiente turno                                               |
| 5   | Príncipe  | 2      | Un jugador (puedes ser tú) descarta su mano y roba otra                                 |
| 6   | Rey       | 1      | Intercambias tu mano con la de otro jugador                                             |
| 7   | Condesa   | 1      | **Debes** descartarla si tienes Rey o Príncipe en la mano                               |
| 8   | Princesa  | 1      | Si la descartas por cualquier motivo, quedas eliminado                                  |

- **Setup**: se aparta 1 carta boca abajo **siempre**; con 2 jugadores se descubren además 3 cartas boca arriba.
- **Turno**: robas 1 (tienes 2 en mano) y descartas 1 aplicando su efecto.
- **Fin de ronda**: el mazo se vacía al terminar un turno (gana la mano más alta; desempate por suma de descartes) o queda un solo jugador en pie.
- **Fin de partida**: fichas de afecto — 7 con 2 jugadores, 5 con 3, 4 con 4.

**Casos borde que han roto implementaciones ajenas** — trátalos como requisitos, no como detalles:

- Si **todos** los rivales están protegidos por Sirvienta, el Príncipe **debe** apuntarse a sí mismo; las demás cartas de objetivo se descartan sin efecto.
- La Princesa elimina a quien la descarte **por cualquier motivo**, incluido el descarte forzado por un Príncipe.
- El Guardia no puede adivinar "Guardia".
- El Barón empatado **no elimina a nadie**.
- La obligación de la Condesa se valida **antes** de la jugada, no como efecto.

## Stack — verdades del proyecto

| Capa                      | Tecnología                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor (`packages/engine`) | TypeScript 7 estricto · **cero dependencias de runtime** · sin DOM · sin APIs de Node · **sin build** ([ADR 0005](docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md)) |
| Cliente (`apps/web`)      | Vite + TypeScript. Técnica de render (DOM vs Canvas): ADR pendiente de la Fase 3                                                                                                            |
| Servidor (`services/api`) | Node 22+ · TypeScript · Fastify · WebSocket                                                                                                                                                 |
| Persistencia              | PostgreSQL con migraciones versionadas en archivos                                                                                                                                          |
| Tests                     | Vitest                                                                                                                                                                                      |
| Lint y formato            | **oxlint** + **Prettier** — sin ESLint ([ADR 0006](docs/decisions/0006-linter-y-formateador-oxlint-prettier.md))                                                                            |

TypeScript estricto significa, mínimo: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Sin `any` en `packages/engine`. Sin `console.log` en código de producción.

Además, por el [ADR 0005](docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md): `module` y `moduleResolution` en `nodenext`, más `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit` y `erasableSyntaxOnly`.

**No** introduzcas otra base de datos, framework de UI, ORM ni herramienta de monorepo sin ADR. **No instales ESLint**: el paquete `typescript` 7 ya no publica la API JS del compilador, así que `typescript-eslint` no puede funcionar (ADR 0006).

## ⚠️ Invariantes del motor — romper una de estas es un bug, no una decisión de estilo

Vienen del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md). Léelo entero antes de tocar `packages/engine`.

### La UI nunca ve `GameState`

`GameState` lo sabe todo (mazo, carta apartada, manos ajenas). La presentación consume **solo** `PlayerView`, producida por `project(state, playerId)` dentro del motor. En local la proyección corre en memoria; en la Fase 4 corre en el servidor. Filtrar información oculta es responsabilidad del motor — jamás de la UI.

En `PlayerView` lo oculto **no existe como dato censurado**: el mazo es `deckCount: number`, no un arreglo de cartas tapadas. Si un dato oculto no está en el tipo, no se puede filtrar por descuido.

### Prohibido `Math.random()`

El barajado usa un PRNG sembrado y la semilla vive dentro del estado. Misma semilla + misma secuencia de comandos = misma partida, carta por carta. De ahí salen los tests deterministas, los replays y la re-verificación del servidor.

### Comando → `Result<{ state, events }>`

`applyCommand(state, cmd)` devuelve un `Result` con el estado nuevo y los eventos. Estado **inmutable**: nunca se muta en sitio. Jugada ilegal = valor de retorno (`RuleViolation`), **no** una excepción. Los eventos llevan **audiencia** (público o lista de jugadores): así el conocimiento privado del Sacerdote se deriva del log filtrado, sin una estructura paralela de "quién sabe qué".

### El `exports` es la frontera, y el default es el seguro

```
  "."         →  PlayerView, Command, legalMoves     (superficie segura)
  "./server"  →  GameState, applyCommand, project    (autoridad completa)
```

`apps/web` importa `@ll/engine`. `services/api` y las pruebas del motor importan `@ll/engine/server`. Alcanzar `GameState` desde la superficie segura es un error de compilación (`TS2305`), no una infracción de estilo. El import corto y cómodo es el que no puede filtrar información oculta; llegar al estado completo obliga a escribir `/server`, y eso se ve en el diff.

Funciona porque `legalMoves` se calcula íntegramente desde una `PlayerView`: ninguna regla de legalidad depende de información oculta ([ADR 0005](docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md)).

### Sintaxis borrable: nada de `enum`

`erasableSyntaxOnly` prohíbe `enum`, `namespace` y propiedades de parámetro — Node los rechaza al ejecutar `.ts` directo. Es una desviación deliberada de la letra del PDD, argumentada en el [ADR 0005](docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md). En su lugar, objetos constantes con uniones literales:

```ts
const CARD = { Guard: 1, Priest: 2, /* … */ Princess: 8 } as const;
type CardName = keyof typeof CARD;
type CardValue = (typeof CARD)[CardName];
```

Los imports relativos dentro del motor llevan extensión **`.ts`** (no `.js`): es lo que exige Node al ejecutar el fuente.

### Las reglas viven solo en `packages/engine`

Ni `apps/web` ni `services/api` implementan lógica de juego. Una validación de regla escrita fuera del motor es un bug, aunque funcione.

### Actualiza la documentación en el mismo cambio

El linaje de repos acumuló deriva grave entre docs y código. Aquí es regla dura: **si un cambio altera stack, layout o convenciones, el mismo PR actualiza `CLAUDE.md`, `openspec/config.yaml`, `README.md` y `docs/decisions/_index.md`.** Está en el checklist de cierre.

## Estructura de carpetas

```
loveletter_onlinegame/
├── packages/engine/    motor de reglas (TS puro, cero deps)
├── apps/web/           cliente navegador
├── services/api/       servidor autoritativo + BD
├── docs/decisions/     ADRs numerados monotónicamente (única ubicación)
├── openspec/           specs (fuente de verdad) + changes
└── scripts/github/     bootstrap de labels, milestones e issues
```

No crees `libs/` ni `shared/`. Un paquete nuevo en `packages/` necesita su propio ADR.

## Comandos comunes

### Setup del repo (una vez por máquina)

```bash
npm install
```

Instala husky + commitlint y activa los hooks (`commit-msg` valida el mensaje; `pre-push` bloquea push directo a `main`). El `package.json` de la raíz aloja ese tooling y declara los workspaces.

### Día a día

```bash
npm test                          # Vitest en todos los workspaces
npm run typecheck                 # tsc --noEmit en todos los workspaces
npm test --workspace packages/engine

npm run lint                      # oxlint — invariantes del motor como reglas
npm run format                    # Prettier — escribe
npm run format:check              # Prettier — solo verifica (el que usará el CI)
```

El lint acota sus reglas por directorio desde un solo `.oxlintrc.json` en la raíz: `Math.random()`
prohibido en el motor, `@loveletter/engine/server` prohibido en `apps/web`, `console.log` fuera de
`tests/`. Cada mensaje cita el ADR que origina la regla.

## Flujo obligatorio para nuevos requerimientos

```
/opsx:explore → /opsx:propose → /opsx:apply → /opsx:archive
```

1. **`/opsx:explore`** — entender el problema: requerimientos, decisiones, riesgos, preguntas abiertas. No se escribe código aquí.
2. **`/opsx:propose`** — `proposal.md`, `design.md`, `specs`, `tasks.md`. **El propose es el compromiso — hasta que no existe, no hay implementación.**
3. **`/opsx:apply`** — implementar tarea por tarea, registrando en la propia tarea cualquier desviación del plan.
4. **`/opsx:archive`** — cerrar el change y el issue de GitHub.

Excepción de proporcionalidad ([ADR 0001](docs/decisions/0001-proceso-openspec-adrs-github.md)): correcciones triviales (typo, formato) van con issue + PR sin change. La regla aplica a cambios de **comportamiento**.

## ADRs

Decisiones no triviales → `docs/decisions/NNNN-titulo.md` usando [la plantilla](docs/decisions/_template.md). Numeración monotónica. Un ADR `Accepted` es **inmutable**: si la decisión cambia, se escribe uno nuevo y el viejo se marca `Superseded by ADR-NNNN`. Actualizar `_index.md` en el mismo PR.

## Convenciones de código

- Commits: Conventional Commits en español (`feat|fix|docs|style|refactor|perf|test|chore|ci|revert`), header ≤ 100 chars.
- Branching: trunk-based, ramas `<tipo>/<slug>` de vida corta, squash & merge.
- **`main` está protegida en el servidor**, no solo por el hook local:
  - Los cambios entran obligatoriamente por PR. El push directo lo rechaza GitHub con `GH006`, y la protección **aplica también a los administradores**: no hay salida por ser dueño del repo.
  - Cuatro checks obligatorios: `typecheck`, `test`, `lint` y `commit-convention`.
  - Force-push y borrado de `main` prohibidos; historia lineal exigida.
  - **Cero aprobaciones requeridas**, a propósito: con un solo desarrollador, exigir una revisión bloquearía el repositorio por completo — nadie puede aprobar su propio PR. Cuando entre una segunda persona, subir este número es el primer ajuste.
  - Squash es el único método de merge, y el título del PR se vuelve el mensaje de commit (`squash_merge_commit_title = PR_TITLE`). Por eso `commit-convention` valida el título: es literalmente lo que queda en la historia.
  - **Romper el cristal** requiere retirar la protección desde la configuración del repositorio, hacer el cambio y volver a ponerla. Es deliberadamente incómodo y deja rastro en el log de auditoría.
- **Código en inglés** (identificadores, tipos, nombres de archivo), **UI y documentación en español**. Los términos del dominio se nombran en inglés en el código (`Guard`, `Handmaid`, `Countess`) y se traducen solo en la capa de presentación.
- Sin `enum` ni `namespace` (ADR 0005). Imports relativos con extensión `.ts`.
- Toda regla de juego nueva o modificada lleva su prueba unitaria en el mismo cambio.

## Antes de cerrar un cambio

- [ ] `npm test` y `npm run typecheck` pasan.
- [ ] Si cambia comportamiento: spec de OpenSpec actualizada en el mismo cambio.
- [ ] Si toca el motor: las invariantes del ADR 0004 siguen en pie, y `PlayerView` no expone nada nuevo que deba estar oculto.
- [ ] Si cambia stack/layout/convenciones: ADR nuevo + `CLAUDE.md` + `openspec/config.yaml` + `README.md` + `_index.md` actualizados.
- [ ] Toda regla de juego tocada tiene prueba.

## Cosas que **no** existen todavía (no las inventes)

- **No hay reglas de juego.** Los tres workspaces ya existen y se enlazan, pero `packages/engine` solo tiene marcadores mínimos (`GameState`, `PlayerView`, `project` y `CARD`) que existen para sostener la frontera del `exports`. El modelo real llega con el issue #7 y las reglas con la Fase 2.
- No hay UI: `apps/web` es un punto de entrada que prueba el enlace con el motor. La interfaz real es la Fase 3.
- No hay servidor, ni base de datos, ni persistencia: `services/api` es un esqueleto. Fastify, WebSocket y PostgreSQL son la Fase 4.
- No hay bots, ranking, chat, cuentas ni arte propio — ver "Fuera de alcance" en [ROADMAP.md](ROADMAP.md).

Cuando algo de esta lista se cree, actualiza esta sección en el mismo PR.
