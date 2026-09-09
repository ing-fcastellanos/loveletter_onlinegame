#!/usr/bin/env bash
# Bootstrap del tablero de GitHub: labels, milestones e issues del ROADMAP.
# Idempotencia: labels y milestones sí (se actualizan/omiten); issues NO — correr
# la sección de issues una sola vez o borrar duplicados a mano.
# Requiere: gh CLI autenticado con permisos sobre el repo.
set -euo pipefail

REPO="ing-fcastellanos/loveletter_onlinegame"

label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force; }

milestone() {
  local title="$1" desc="$2"
  if gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title' | grep -Fxq "$title"; then
    echo "milestone ya existe: $title"
  else
    gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" --silent
    echo "milestone creado: $title"
  fi
}

issue() {
  local title="$1" ms="$2" labels="$3"
  gh issue create --repo "$REPO" --title "$title" --milestone "$ms" --label "$labels" --body-file -
}

# ---------------------------------------------------------------- labels
echo "== Labels =="
label "type: feature"  "0e8a16" "Funcionalidad nueva o cambio de comportamiento"
label "type: bug"      "d73a4a" "Algo no funciona"
label "type: chore"    "64748b" "Infraestructura, tooling, mantenimiento"
label "type: adr"      "6f42c1" "Decisión arquitectónica a documentar en docs/decisions"
label "type: research" "fbca04" "Spike de investigación con entregable documentado"
label "type: test"     "0ea5e9" "Pruebas y cobertura"
label "type: docs"     "0075ca" "Documentación"
label "area: engine"     "7c3aed" "packages/engine — motor de reglas"
label "area: web"        "14b8a6" "apps/web — cliente navegador"
label "area: api"        "1d76db" "services/api — servidor y base de datos"
label "area: foundation" "94a3b8" "Repo, tooling, CI, convenciones"
label "priority: P0" "b60205" "Crítica — bloquea la fase"
label "priority: P1" "d93f0b" "Alta"
label "priority: P2" "e99695" "Media"
label "priority: P3" "cbd5e1" "Baja / oportunista"

# ---------------------------------------------------------------- milestones
echo "== Milestones =="
F0="Fase 0 — Fundaciones";                 milestone "$F0" "Monorepo con workspaces, TypeScript estricto, Vitest, CI y tablero. Sin reglas de juego."
F1="Fase 1 — Modelado y core engine";      milestone "$F1" "Hito 1: tipos, mazo, barajado determinista, setup, PlayerView y ciclo de turno sin efectos."
F2="Fase 2 — Efectos y reglas";            milestone "$F2" "Hito 2: las 8 cartas, validadores previos y condiciones de victoria de ronda y partida."
F3="Fase 3 — Interfaz y persistencia";     milestone "$F3" "Hito 3: UI reactiva a eventos, controles de juego y autoguardado versionado en localStorage."
F4="Fase 4 — Backend y multijugador";      milestone "$F4" "Hito 4: servidor autoritativo con WebSocket, PostgreSQL con migraciones versionadas y lobbies."

# ---------------------------------------------------------------- issues Fase 0
echo "== Issues Fase 0 =="

issue "Scaffolding del monorepo: packages/engine, apps/web y services/api" "$F0" "type: chore,area: foundation,priority: P0" <<'EOF'
## Contexto
El repo solo tiene proceso, ADRs y tablero. El [ADR 0002](docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md) decide monorepo con npm workspaces y motor compartido; falta materializarlo.

## Objetivo
- [ ] `packages/engine` con `package.json` propio, **cero dependencias de runtime**, sin DOM ni APIs de Node, y `exports` que resuelvan tanto desde Vite como desde Node.
- [ ] `apps/web` con Vite + TypeScript, dependiendo de `packages/engine` por nombre de workspace.
- [ ] `services/api` esqueletado (solo estructura y `package.json`; Fastify y BD llegan en la Fase 4).
- [ ] Scripts de raíz `test` y `typecheck` que recorran los workspaces.

## Criterios de éxito
`npm install` desde la raíz enlaza los tres workspaces; `apps/web` importa un símbolo de `packages/engine` y compila; `npm run typecheck` pasa en los tres.

## Notas
Ninguna regla de juego entra aquí — este issue solo levanta la estructura.
EOF

issue "TypeScript estricto: configuración base compartida" "$F0" "type: chore,area: foundation,priority: P0" <<'EOF'
## Contexto
El primer objetivo técnico del PDD es modelar el estado "con cero ambigüedad". Eso se ejecuta con la configuración del compilador, no con buenas intenciones. El [ADR 0003](docs/decisions/0003-stack-typescript-cliente-y-servidor.md) fija el mínimo.

## Objetivo
- [ ] `tsconfig.base.json` en la raíz con al menos: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `verbatimModuleSyntax`.
- [ ] Cada workspace extiende la base y solo sobrescribe lo propio de su entorno (DOM en `web`, Node en `api`; `engine` sin ninguna de las dos librerías).
- [ ] `packages/engine` sin `any`, ni implícito ni explícito.

## Criterios de éxito
`npm run typecheck` pasa. Un intento deliberado de indexar un arreglo sin comprobar (`deck[0].value`) es un error de compilación, no un `undefined` en runtime.

**Bloqueada por:** Scaffolding del monorepo.
EOF

issue "Vitest y estrategia de pruebas del monorepo" "$F0" "type: chore,area: foundation,priority: P0" <<'EOF'
## Contexto
Las reglas del juego se validan con pruebas, y el determinismo del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) las hace posibles sin mocks: dada una semilla, la partida se reproduce exacta.

## Objetivo
- [ ] Vitest configurado en los tres workspaces, ejecutable desde la raíz con `npm test`.
- [ ] Convención de ubicación y nombrado de pruebas documentada en `CLAUDE.md`.
- [ ] Helpers de prueba en `packages/engine` para construir estados desde una semilla y una secuencia de comandos, en vez de fabricar estados a mano.
- [ ] Reporte de cobertura disponible (sin umbral obligatorio todavía).

## Criterios de éxito
`npm test` corre en los tres workspaces. Existe al menos una prueba de ejemplo que demuestra que la misma semilla produce el mismo barajado.

**Bloqueada por:** Scaffolding del monorepo · TypeScript estricto.
EOF

issue "Lint y formato con reglas que hacen ejecutables las invariantes del motor" "$F0" "type: chore,area: foundation,priority: P1" <<'EOF'
## Contexto
El [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) prohíbe `Math.random()` en el motor y prohíbe que la UI consuma `GameState`. Una regla que solo vive en la documentación se rompe tarde o temprano: conviene que la rompa el linter, no una revisión.

## Objetivo
- [ ] ESLint + Prettier configurados en los tres workspaces.
- [ ] Regla que **prohíbe `Math.random()`** dentro de `packages/engine`.
- [ ] Regla que prohíbe a `apps/web` importar el tipo `GameState` (solo `PlayerView` y los comandos).
- [ ] Regla que prohíbe `console.log` fuera de código de prueba.

## Criterios de éxito
Introducir a propósito un `Math.random()` en el motor, o un import de `GameState` en la UI, hace fallar el lint.

**Bloqueada por:** Scaffolding del monorepo.
EOF

issue "CI: PR gates con typecheck, tests, lint y convención de commits" "$F0" "type: chore,area: foundation,priority: P0" <<'EOF'
## Contexto
Los hooks locales (husky) validan en la máquina de quien desarrolla. El PR necesita su propia red de seguridad, y en un repo público es además la señal visible de que el proyecto está sano.

## Objetivo
- [ ] Workflow `pr-gates.yml` que en cada PR corre: `typecheck`, `test`, `lint`.
- [ ] Check que valida el **título del PR** como Conventional Commit en español (bajo squash & merge, ese título es el mensaje que queda en `main`).
- [ ] Caché de dependencias para que el workflow no tarde de más.
- [ ] Badge de estado en el `README.md`.

## Criterios de éxito
Un PR con una prueba rota queda en rojo. Un PR con título mal formado queda en rojo.

**Bloqueada por:** Vitest · Lint y formato.
EOF

issue "Protección de main y configuración del tablero" "$F0" "type: chore,area: foundation,priority: P2" <<'EOF'
## Contexto
Hoy la protección de `main` es solo local: el hook `pre-push` rechaza el push directo. Al ser este un repositorio **público**, GitHub permite reglas de protección de rama sin costo — conviene activarlas server-side.

## Objetivo
- [ ] Proteger `main`: prohibir push directo, exigir PR y marcar los checks de `pr-gates` como required.
- [ ] Verificar que las plantillas de issue y de PR se muestran correctamente al abrir uno.
- [ ] Documentar en `CLAUDE.md` que la protección ya es server-side (retirar la nota de "no existe todavía").

## Criterios de éxito
Un `git push` directo a `main` es rechazado por el servidor, no solo por el hook local.

**Bloqueada por:** CI: PR gates.
EOF

# ---------------------------------------------------------------- issues Fase 1
echo "== Issues Fase 1 =="

issue "Modelo de datos: Card, Player, GameState y primitivas del dominio" "$F1" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Primer entregable del Hito 1 del PDD: interfaces precisas para `Player`, `Card` (los 8 personajes con sus valores) y `GameState`. Es el vocabulario del que dependerá todo lo demás, así que la precisión aquí se paga sola.

## Objetivo
- [ ] Enum o unión literal de los 8 personajes con su valor: Guardia(1), Sacerdote(2), Barón(3), Sirvienta(4), Príncipe(5), Rey(6), Condesa(7), Princesa(8). Nombres en inglés en el código.
- [ ] `Player` con identidad, mano, descartes, estado de eliminación, protección de Sirvienta y fichas de afecto.
- [ ] `GameState` **autoritativo**: mazo ordenado, carta apartada, cartas descubiertas (partida a dos), jugadores, turno actual, semilla del PRNG y número de ronda.
- [ ] Tipos `Result` y `RuleViolation`: una jugada ilegal es un valor de retorno, **nunca** una excepción (ADR 0004).
- [ ] Todos los tipos de estado marcados como profundamente inmutables (`readonly`).

## Criterios de éxito
Un estado imposible no se puede construir sin que el compilador se queje. Ejemplo a verificar: no debe existir un tipo que permita una mano de 3 cartas fuera del instante del turno.

## Notas
Modelar bien la mano es la decisión con más consecuencias: fuera del turno son 1 carta, durante el turno son 2. Vale la pena que el tipo lo refleje en vez de dejarlo a un arreglo de longitud variable.
EOF

issue "Mazo de 16 cartas y barajado determinista con PRNG sembrado" "$F1" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
El [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) prohíbe `Math.random()`: el barajado consume un PRNG sembrado y la semilla vive en el estado. De ahí salen los tests deterministas, los replays y la re-verificación del servidor en la Fase 4.

## Objetivo
- [ ] Construcción del mazo con las multiplicidades correctas: Guardia x5, Sacerdote x2, Barón x2, Sirvienta x2, Príncipe x2, Rey x1, Condesa x1, Princesa x1 — **16 cartas**.
- [ ] PRNG determinista implementado en el motor (sin dependencias) y sembrado desde el estado.
- [ ] Barajado Fisher-Yates que consume el PRNG; la aleatoriedad se **inyecta**, no se importa.
- [ ] La semilla se conserva en el `GameState` para poder reproducir la partida.

## Criterios de éxito
- La misma semilla produce el mismo orden de mazo, siempre.
- Semillas distintas producen órdenes distintos.
- El mazo siempre tiene 16 cartas y la distribución exacta de valores.

**Bloqueada por:** Modelo de datos.
EOF

issue "Setup de ronda: carta apartada, descubiertas a dos jugadores y mano inicial" "$F1" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Tercer entregable del Hito 1. El setup tiene una regla que se olvida seguido: además de la carta apartada boca abajo (que va **siempre**), en la partida de **2 jugadores** se descubren 3 cartas boca arriba.

## Objetivo
- [ ] Iniciar ronda para 2, 3 o 4 jugadores; rechazar cualquier otro número.
- [ ] Apartar 1 carta boca abajo siempre.
- [ ] Con exactamente 2 jugadores, descubrir además 3 cartas boca arriba (visibles para todos).
- [ ] Repartir 1 carta a cada jugador.
- [ ] Determinar quién empieza la ronda.

## Criterios de éxito
- Partida a 2: mazo restante = 16 − 1 apartada − 3 descubiertas − 2 repartidas = **10**.
- Partida a 3: 16 − 1 − 3 = **12**. Partida a 4: 16 − 1 − 4 = **11**.
- Las 3 descubiertas aparecen en la vista de todos los jugadores; la apartada, en la de ninguno.

**Bloqueada por:** Mazo y barajado determinista.
EOF

issue "Proyección PlayerView: la información oculta no existe en el tipo" "$F1" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
La invariante central del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md). Se implementa **en la Fase 1**, no cuando llegue el multijugador: si la UI se construye leyendo `GameState`, la Fase 4 deja de ser transporte y se vuelve rediseño.

## Objetivo
- [ ] `project(state, playerId): PlayerView` dentro de `packages/engine`.
- [ ] En `PlayerView` lo oculto está **ausente**, no censurado: el mazo es `deckCount: number`, no un arreglo de cartas tapadas; la carta apartada no aparece de ninguna forma.
- [ ] El jugador ve su propia mano completa; de los rivales solo ve lo público (descartes, eliminación, protección) y lo que haya llegado a conocer.
- [ ] Las 3 cartas descubiertas de la partida a dos sí aparecen en todas las vistas.

## Criterios de éxito
Una prueba recorre exhaustivamente una `PlayerView` serializada y confirma que **ninguna** carta oculta aparece en ella — ni el mazo, ni la apartada, ni la mano de un rival. Esta prueba es la red que protege el juego en línea.

**Bloqueada por:** Setup de ronda.
EOF

issue "Eventos con audiencia y log de partida" "$F1" "type: feature,area: engine,priority: P1" <<'EOF'
## Contexto
El [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) decide que cada evento declara quién puede verlo. Así el conocimiento privado (lo que un jugador vio con el Sacerdote) se **deriva del log filtrado**, en vez de mantenerse en una estructura aparte que hay que sincronizar a mano.

## Objetivo
- [ ] Tipo `GameEvent` con audiencia: público, o restringido a una lista de jugadores.
- [ ] El log de eventos vive en el estado y crece con cada comando.
- [ ] `project(state, playerId)` filtra el log con el mismo criterio con que filtra el estado.
- [ ] Eventos base de la Fase 1: ronda iniciada, carta robada, carta descartada, turno cambiado.

## Criterios de éxito
Un evento restringido a los jugadores A y B no aparece en la `PlayerView` de C, ni siquiera como entrada anónima que delate que algo pasó entre ellos.

**Bloqueada por:** Proyección PlayerView.
EOF

issue "Ciclo de turno: robar y descartar, iterando entre jugadores sin efectos" "$F1" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Último entregable del Hito 1: "programar el ciclo básico de turno (robar carta y elegir descarte) permitiendo la iteración entre jugadores **sin aplicar aún los efectos**". Es el esqueleto sobre el que la Fase 2 monta los poderes.

## Objetivo
- [ ] `applyCommand(state, cmd): Result<{ state, events }, RuleViolation>` con la forma definitiva del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md).
- [ ] Comando de robar y comando de descartar (**sin resolver el efecto de la carta**).
- [ ] Validación de turno: un jugador no puede actuar fuera de su turno ni descartar una carta que no tiene.
- [ ] Avance al siguiente jugador vivo, saltando eliminados.
- [ ] Estado inmutable: cada comando devuelve un estado nuevo; el anterior queda intacto.

## Criterios de éxito
Se puede jugar una ronda completa de cartas sin poderes: los jugadores roban y descartan por turnos hasta que el mazo se vacía, y el estado inicial nunca fue mutado.

**Bloqueada por:** Modelo de datos · Setup de ronda · Eventos con audiencia.
EOF

# ---------------------------------------------------------------- issues Fase 2
echo "== Issues Fase 2 =="

issue "Motor de resolución de efectos: contrato y despacho" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
La Fase 1 dejó el ciclo de turno funcionando sin poderes. Antes de escribir los 8 efectos conviene fijar cómo se declaran y se resuelven, para que las cartas no terminen en un `switch` de 300 líneas con reglas dispersas.

## Objetivo
- [ ] Contrato de efecto: recibe estado + jugador que juega + parámetros del comando, devuelve estado nuevo y eventos.
- [ ] Declaración por carta de qué parámetros exige: el Guardia necesita objetivo **y** carta adivinada; Príncipe y Rey necesitan objetivo; Sirvienta, Condesa y Princesa no necesitan ninguno.
- [ ] Despacho desde `applyCommand`, con exhaustividad verificada por el compilador (agregar una carta sin su efecto debe ser error de compilación).
- [ ] El descarte "sin efecto" (cuando no hay objetivo legal) es un resultado válido y explícito, no un caso olvidado.

## Criterios de éxito
Agregar un personaje nuevo al enum rompe la compilación hasta que se declare su efecto y sus parámetros.

**Bloqueada por:** Ciclo de turno.
EOF

issue "Efectos de Guardia y Sacerdote: deducción e información" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Las dos cartas de información. El Sacerdote es la prueba de fuego del modelo de eventos con audiencia del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md): lo que ve quien lo juega es conocimiento **suyo**, y de nadie más.

## Objetivo
- [ ] **Guardia (1)**: nombra una carta que no sea Guardia y apunta a un jugador; si acierta, el objetivo queda eliminado.
- [ ] Adivinar "Guardia" es una jugada ilegal, rechazada como `RuleViolation` antes de resolverse.
- [ ] **Sacerdote (2)**: quien lo juega ve la mano del objetivo. El evento resultante tiene audiencia restringida a él.
- [ ] Ambos se descartan sin efecto si no hay ningún objetivo legal.

## Criterios de éxito
- Guardia acertado elimina; fallado no hace nada; adivinar "Guardia" es rechazado.
- Tras un Sacerdote, la carta vista aparece en la `PlayerView` de quien lo jugó y **no** en la de los demás — incluida la del propio objetivo, que no sabe si fue visto.

**Bloqueada por:** Motor de resolución de efectos.
EOF

issue "Efectos de Barón y Sirvienta: comparación y protección" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
El Barón produce eliminación por comparación privada, y la Sirvienta introduce el concepto de objetivo **ilegal por protección**, que a partir de aquí condiciona a todas las demás cartas.

## Objetivo
- [ ] **Barón (3)**: los dos jugadores comparan sus manos en privado; el de menor valor queda eliminado. **Empate: no se elimina a nadie.**
- [ ] La comparación genera un evento con audiencia restringida a los dos implicados; la eliminación resultante sí es pública.
- [ ] **Sirvienta (4)**: quien la juega queda inmune a efectos hasta el inicio de su siguiente turno.
- [ ] La protección expira en el momento correcto, y un jugador protegido no es objetivo legal para ninguna carta.

## Criterios de éxito
- Barón con empate deja a los dos vivos.
- Los dos implicados en un Barón conocen el resultado de la comparación; un tercero solo ve quién quedó eliminado, no qué cartas había.
- Apuntar a un jugador protegido es `RuleViolation`; la protección desaparece justo al empezar su turno siguiente.

**Bloqueada por:** Motor de resolución de efectos.
EOF

issue "Efectos de Príncipe y Rey: manipulación de manos" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Las dos cartas que mueven cartas entre manos y mazo. El Príncipe concentra el caso borde más citado del juego: **si todos los rivales están protegidos, debe apuntarse a sí mismo**.

## Objetivo
- [ ] **Príncipe (5)**: el objetivo (que puede ser uno mismo) descarta su mano y roba otra.
- [ ] Si el mazo está vacío, el objetivo roba la **carta apartada** al inicio de la ronda.
- [ ] Si el objetivo descarta la **Princesa** por este efecto, queda eliminado.
- [ ] Cuando todos los rivales están protegidos, apuntarse a sí mismo es la única jugada legal — y el motor lo exige, no lo sugiere.
- [ ] **Rey (6)**: intercambia manos con otro jugador. Nunca consigo mismo.

## Criterios de éxito
- Príncipe sobre mazo vacío entrega la carta apartada.
- Príncipe que fuerza el descarte de la Princesa elimina al objetivo.
- Con todos los rivales protegidos, apuntar a un rival es rechazado y apuntarse a sí mismo es aceptado.
- Tras un Rey, cada jugador ve su mano nueva en su `PlayerView` y ninguno ve la del otro.

**Bloqueada por:** Efectos de Barón y Sirvienta.
EOF

issue "Efectos de Condesa y Princesa: autorrestricción y autoeliminación" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Las dos cartas que actúan sobre quien las tiene. La Condesa no tiene efecto al descartarse: su regla es una **restricción previa a la jugada**, y por eso se valida antes, no al resolver.

## Objetivo
- [ ] **Condesa (7)**: descartarla no produce efecto alguno.
- [ ] **Princesa (8)**: quien la descarte queda eliminado — **por cualquier motivo**, incluido el descarte forzado por un Príncipe y el intercambio que la deje fuera.
- [ ] La eliminación por Princesa hace descartar el resto de la mano, como cualquier eliminación.

## Criterios de éxito
- Descartar la Princesa voluntariamente elimina a quien lo hace.
- Un Príncipe que fuerza a descartar la Princesa elimina al objetivo (mismo camino de código, no una rama duplicada).
- Descartar la Condesa no altera el estado más allá del descarte y el cambio de turno.

**Bloqueada por:** Efectos de Príncipe y Rey.
EOF

issue "Validadores previos a la jugada: Condesa obligatoria y objetivos legales" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Segundo entregable del Hito 2 del PDD: "implementar validadores de reglas previos a la jugada (ej. la restricción ineludible de jugar la Condesa si se tiene el Rey o el Príncipe en mano)". Son reglas que rechazan la jugada **antes** de que exista un efecto que resolver.

## Objetivo
- [ ] **Regla de la Condesa**: si la mano contiene Condesa **y** (Rey o Príncipe), la única jugada legal es descartar la Condesa. Cualquier otra es `RuleViolation`.
- [ ] Validación de objetivos: no se puede apuntar a un jugador eliminado, ni a uno protegido por Sirvienta, ni a uno mismo salvo con el Príncipe.
- [ ] Validación de parámetros: el Guardia exige objetivo y carta adivinada, y la adivinada no puede ser "Guardia".
- [ ] Función que enumera **las jugadas legales** de un jugador en un estado dado — la UI de la Fase 3 la consumirá para no reimplementar la validación.
- [ ] Cada `RuleViolation` explica cuál regla se violó, de forma presentable al usuario.

## Criterios de éxito
- Con Condesa + Rey en mano, jugar el Rey es rechazado; jugar la Condesa es aceptado.
- Con Condesa + Guardia (sin Rey ni Príncipe), jugar el Guardia es perfectamente legal — la restricción **no** aplica.
- La enumeración de jugadas legales nunca incluye una que `applyCommand` rechazaría, y nunca omite una que aceptaría.

**Bloqueada por:** Efectos de Condesa y Princesa.
EOF

issue "Fin de ronda: mazo vacío, último en pie y desempates" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Tercer entregable del Hito 2: "desarrollar el sistema de condiciones de victoria, detectando cuándo se vacía el mazo o cuándo queda un único jugador en pie, para calcular al ganador de la ronda".

## Objetivo
- [ ] La ronda termina si al concluir un turno el mazo quedó vacío, o si queda un solo jugador sin eliminar.
- [ ] Con mazo vacío gana la **mano más alta**; el desempate se resuelve por la **suma de los descartes**.
- [ ] Con un solo superviviente, gana sin comparar nada.
- [ ] Al terminar la ronda se revelan las manos y la carta apartada, mediante eventos públicos.
- [ ] El ganador recibe una ficha de afecto.

## Criterios de éxito
- Una ronda que se queda sin mazo con dos jugadores empatados en mano se resuelve por suma de descartes.
- La carta apartada solo aparece en las `PlayerView` **después** del evento de fin de ronda, nunca antes.

**Bloqueada por:** Validadores previos a la jugada.
EOF

issue "Fin de partida: fichas de afecto y encadenado de rondas" "$F2" "type: feature,area: engine,priority: P0" <<'EOF'
## Contexto
Una partida es una sucesión de rondas hasta que alguien acumula suficientes fichas de afecto. El umbral depende del número de jugadores, y es un parámetro de las reglas — no un número suelto en el código.

## Objetivo
- [ ] Umbral por número de jugadores: **7** con 2, **5** con 3, **4** con 4.
- [ ] Al terminar una ronda sin ganador de partida, se inicia la siguiente conservando fichas y avanzando la semilla de forma determinista.
- [ ] Quien ganó la ronda anterior empieza la siguiente.
- [ ] Estado de partida terminada, con su ganador y evento público.

## Criterios de éxito
Una partida completa a 2 jugadores llega a 7 fichas y termina. Reproducida desde la misma semilla inicial, la partida entera —todas sus rondas— sale idéntica.

**Bloqueada por:** Fin de ronda.
EOF

issue "Suite de partidas deterministas de extremo a extremo" "$F2" "type: test,area: engine,priority: P1" <<'EOF'
## Contexto
Las pruebas por efecto cubren cada carta aislada. Lo que rompe los motores de juego son las **interacciones**: un Príncipe que fuerza una Princesa mientras el único rival vivo está protegido y el mazo tiene una carta. Con el determinismo del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md), estas pruebas son afirmaciones sobre partidas reales, no sobre estados fabricados.

## Objetivo
- [ ] Partidas completas grabadas como (semilla + secuencia de comandos) con su resultado esperado.
- [ ] Cobertura de las interacciones peligrosas: Príncipe con todos protegidos, Príncipe sobre mazo vacío tomando la apartada, Princesa forzada, Barón empatado, ronda decidida por suma de descartes.
- [ ] Prueba de invariantes que corre tras **cada** comando de cada partida grabada: el total de cartas en el sistema siempre es 16, ninguna carta está en dos lugares, y ninguna `PlayerView` contiene información oculta.
- [ ] Prueba de que el estado nunca se muta en sitio.

## Criterios de éxito
La suite corre en segundos y falla de forma legible, señalando el comando exacto de la secuencia en que se rompió la invariante.

**Bloqueada por:** Fin de partida.
EOF

# ---------------------------------------------------------------- issues Fase 3
echo "== Issues Fase 3 =="

issue "Spike + ADR: técnica de render de la UI (DOM vs Canvas)" "$F3" "type: research,area: web,priority: P0" <<'EOF'
## Contexto
El PDD deja la puerta abierta: "utilizando Canvas o manipulación del DOM". El [ADR 0003](docs/decisions/0003-stack-typescript-cliente-y-servidor.md) dejó la decisión explícitamente para esta fase, cuando ya hay un motor real contra el cual prototipar en vez de especular.

## Objetivo
- [ ] Prototipo mínimo con cada técnica: una mesa con manos, descartes y una animación de carta jugada.
- [ ] Comparar con criterios declarados antes de prototipar: esfuerzo de animación, accesibilidad, facilidad de depuración, adecuación a un juego de cartas por turnos (que no es de 60 fps).
- [ ] ADR con la decisión, las alternativas y las condiciones de re-evaluación.
- [ ] Actualizar `CLAUDE.md`, `README.md`, `openspec/config.yaml` y `docs/decisions/_index.md` (regla anti-deriva).

## Criterios de éxito
Existe el ADR y los prototipos que lo respaldan son ejecutables desde el repo.

**Bloqueada por:** Suite de partidas deterministas.
EOF

issue "Shell de la UI: mesa, manos y descartes reaccionando a eventos" "$F3" "type: feature,area: web,priority: P0" <<'EOF'
## Contexto
Primer entregable del Hito 3: una interfaz que "escuche y reaccione a las mutaciones del GameState". Con la arquitectura del [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) eso se afina: la UI reacciona a **eventos** y renderiza desde `PlayerView` — nunca desde `GameState`, al que ni siquiera tiene acceso.

## Objetivo
- [ ] Render de la mesa: jugadores, sus descartes, contador del mazo, quién tiene el turno, quién está protegido y quién eliminado.
- [ ] La mano propia se ve completa; las ajenas, como dorsos.
- [ ] La UI se suscribe al flujo de eventos y actualiza lo que cambió, en vez de redibujar todo por comparación de estados.
- [ ] Textos de la interfaz en español; los nombres de carta se traducen **solo aquí**, el motor los maneja en inglés.

## Criterios de éxito
Una partida jugada por comandos se ve reflejada correctamente en pantalla. El linter impide importar `GameState` desde `apps/web`.

**Bloqueada por:** Spike + ADR de técnica de render.
EOF

issue "Controles: seleccionar carta de la mano y apuntar a objetivos válidos" "$F3" "type: feature,area: web,priority: P0" <<'EOF'
## Contexto
Segundo entregable del Hito 3: "controles interactivos para que un usuario pueda seleccionar cartas de su mano y apuntar a objetivos válidos". La palabra clave es **válidos**: la validez la dicta el motor, no la UI.

## Objetivo
- [ ] Seleccionar una de las dos cartas de la mano durante el turno.
- [ ] La UI pide al motor las jugadas legales y ofrece solo esas: objetivos no seleccionables cuando están protegidos, eliminados o son ilegales para esa carta.
- [ ] Selector de carta adivinada para el Guardia, sin la opción "Guardia".
- [ ] La regla de la Condesa se comunica de forma comprensible: cuando obliga, la UI explica por qué las demás cartas están bloqueadas.
- [ ] Emitir el comando al motor y reaccionar al `Result`, incluyendo el caso de rechazo.

## Criterios de éxito
No existe ninguna secuencia de clics que produzca una jugada ilegal. La validación no está duplicada en el cliente: la UI solo consume la enumeración de jugadas legales del motor.

**Bloqueada por:** Shell de la UI.
EOF

issue "Guardado automático versionado en localStorage" "$F3" "type: feature,area: web,priority: P0" <<'EOF'
## Contexto
Tercer entregable del Hito 3: "guardado automático del estado serializado de la partida en el almacenamiento local del navegador, permitiendo recargar la pestaña y continuar exactamente donde se dejó". El `schemaVersion` que esto requiere es el mismo problema que las migraciones de la Fase 4, en pequeño — conviene tratarlo con la misma seriedad.

## Objetivo
- [ ] Serializar y deserializar el estado con `schemaVersion` explícito.
- [ ] Guardado automático tras cada comando aplicado.
- [ ] Al cargar: si la versión guardada no coincide con la actual, descartar con un aviso claro en vez de fallar de forma opaca o cargar basura.
- [ ] Poder abandonar la partida y empezar una nueva.
- [ ] ADR corto que fije el formato y la política de versionado del guardado.

## Criterios de éxito
Recargar la pestaña a media partida continúa exactamente donde se dejó, incluido el log y el conocimiento privado obtenido con el Sacerdote. Un guardado de versión anterior no rompe la aplicación.

## Notas
Como el estado incluye la semilla y el log de comandos, vale la pena decidir en el ADR si se guarda el estado completo o (semilla + comandos) para reconstruirlo — la segunda opción es más compacta y auto-verificable.

**Bloqueada por:** Controles de juego.
EOF

issue "Log de partida visible y retroalimentación de jugadas ilegales" "$F3" "type: feature,area: web,priority: P1" <<'EOF'
## Contexto
El motor ya produce eventos con audiencia y `RuleViolation` explicativas. Falta que el jugador los vea: sin log, un juego de deducción es injugable, porque deducir requiere recordar.

## Objetivo
- [ ] Panel con el historial de la ronda, alimentado por los eventos **que ese jugador puede ver**.
- [ ] Lo que se aprende con el Sacerdote queda registrado de forma persistente para quien lo jugó.
- [ ] Los `RuleViolation` se muestran con su explicación en español, no como un error genérico.
- [ ] Al terminar la ronda, revelación de manos y de la carta apartada.

## Criterios de éxito
El log de un jugador nunca contiene una línea que revele información que no le corresponde.

**Bloqueada por:** Shell de la UI.
EOF

# ---------------------------------------------------------------- issues Fase 4
echo "== Issues Fase 4 =="

issue "Refactor a comandos asíncronos con latencia de red simulada" "$F4" "type: chore,area: engine,priority: P0" <<'EOF'
## Contexto
Primer entregable del Hito 4: "refactorizar el motor para procesar comandos de forma asíncrona, simulando latencia de red". El objetivo real es descubrir en local, y con control, todos los lugares donde el cliente asume respuesta inmediata — antes de que lo descubra la red.

## Objetivo
- [ ] Interfaz de transporte de comandos: una implementación local (síncrona) y una simulada con latencia y fallos configurables.
- [ ] La UI deja de asumir resultado inmediato: estados de "esperando" y manejo de rechazo diferido.
- [ ] El motor sigue siendo **síncrono y puro**: lo asíncrono es el transporte, no la resolución de reglas.
- [ ] Comandos identificados para poder correlacionar petición y respuesta.

## Criterios de éxito
Con 500 ms de latencia simulada la partida local sigue siendo jugable y no aparecen estados inconsistentes ni dobles envíos.

**Bloqueada por:** Guardado automático versionado.
EOF

issue "Spike + ADR: versionado de migraciones sin colisiones entre entornos" "$F4" "type: research,area: api,priority: P0" <<'EOF'
## Contexto
Requisito explícito del PDD, citado casi literal: "establecer una estrategia robusta de versionado de esquemas para la base de datos; al gestionar diferentes entornos (como staging y producción), es crítico prevenir colisiones de versiones en los scripts de migración para asegurar despliegues sin interrupciones". Es la razón por la que el [ADR 0003](docs/decisions/0003-stack-typescript-cliente-y-servidor.md) eligió PostgreSQL y no una base sin migraciones.

## Objetivo
- [ ] Comparar herramientas del ecosistema Node/TS: migraciones de Drizzle, de Prisma y `node-pg-migrate`.
- [ ] Analizar el problema de colisión concreto: dos ramas que crean una migración con el mismo número secuencial y se fusionan. Comparar numeración secuencial contra marca de tiempo, y checksums de migraciones ya aplicadas.
- [ ] Definir la política: nombrado, orden de aplicación, reversibilidad (o su ausencia deliberada), y cómo se detecta una divergencia entre entornos **antes** de desplegar.
- [ ] Definir el gate de CI que rechaza un PR con migraciones en conflicto.
- [ ] ADR con la decisión y las alternativas descartadas.

## Criterios de éxito
El ADR responde con precisión: qué pasa si dos ramas añaden una migración a la vez, y cómo se entera el equipo antes de que llegue a producción.

**Bloqueada por:** Refactor a comandos asíncronos.
EOF

issue "Esquema de base de datos: perfiles, lobbies e histórico de partidas" "$F4" "type: feature,area: api,priority: P0" <<'EOF'
## Contexto
Segundo entregable del Hito 4: "diseñar la infraestructura de base de datos para almacenar perfiles de usuario, salas de espera (lobbies) y el registro histórico de partidas".

## Objetivo
- [ ] PostgreSQL en Docker para desarrollo local, con arranque documentado.
- [ ] Esquema inicial con integridad referencial real: perfiles, lobbies, participaciones y partidas.
- [ ] El histórico guarda **semilla + secuencia de comandos**, no solo el resultado: con eso cualquier partida pasada se reproduce y se audita (ADR 0004).
- [ ] Primera migración aplicada con la política decidida en el spike.
- [ ] Capa de acceso a datos tipada, separada de la lógica de transporte.

## Criterios de éxito
Levantar la base desde cero con las migraciones produce el esquema esperado. Una partida guardada se reproduce desde su semilla y su log, y llega al mismo resultado final.

**Bloqueada por:** Spike + ADR de versionado de migraciones.
EOF

issue "Servidor autoritativo: Fastify + WebSocket validando con el motor" "$F4" "type: feature,area: api,priority: P0" <<'EOF'
## Contexto
El corazón del Hito 4: "validando los datos desde un servidor autoritativo". El servidor usa exactamente el mismo `packages/engine` que el cliente ([ADR 0002](docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md)), así que no puede divergir en las reglas.

## Objetivo
- [ ] Servidor Fastify con WebSocket y protocolo de mensajes tipado.
- [ ] El `GameState` completo vive **solo** en el servidor. A cada cliente se le envía únicamente su `PlayerView`.
- [ ] Todo comando entrante se re-valida con el motor: el cliente propone, el servidor dispone.
- [ ] Los eventos se difunden respetando su audiencia — un evento restringido no se envía por el socket de quien no debe verlo.
- [ ] Un cliente que envía un comando fuera de turno, o sobre una carta que no tiene, recibe un rechazo y no altera el estado.

## Criterios de éxito
Inspeccionando el tráfico del socket de un jugador **no** aparece ninguna carta oculta: ni el mazo, ni la apartada, ni la mano de un rival. Esta verificación es la prueba de que la arquitectura del ADR 0004 cumplió su promesa.

**Bloqueada por:** Esquema de base de datos.
EOF

issue "Lobbies: crear sala, unirse e iniciar partida" "$F4" "type: feature,area: api,priority: P0" <<'EOF'
## Contexto
Para que dos personas jueguen hace falta un lugar donde encontrarse. El alcance es deliberadamente mínimo: sin emparejamiento automático, sin salas públicas, sin chat.

## Objetivo
- [ ] Crear una sala y obtener un código para compartir.
- [ ] Unirse por código, con validación de cupo (2 a 4 jugadores) y de partida ya iniciada.
- [ ] Identidad ligera de jugador: un nombre y un identificador persistente, **sin contraseñas ni OAuth** (fuera de alcance según el ROADMAP).
- [ ] Iniciar la partida cuando el anfitrión lo decida y haya jugadores suficientes.
- [ ] Manejo de abandono antes de iniciar.

## Criterios de éxito
Dos navegadores distintos entran a la misma sala por código e inician una partida.

**Bloqueada por:** Servidor autoritativo.
EOF

issue "Cliente en línea: conectar al servidor y consumir PlayerView remota" "$F4" "type: feature,area: web,priority: P0" <<'EOF'
## Contexto
La prueba de que la arquitectura era correcta: si el [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) cumplió, la UI de la Fase 3 no debería necesitar cambios de fondo — solo cambiar de dónde llegan la `PlayerView` y los eventos.

## Objetivo
- [ ] Transporte por WebSocket que implementa la misma interfaz que el transporte local con latencia simulada.
- [ ] Pantallas de lobby: crear sala, unirse por código, sala de espera.
- [ ] La UI de partida se reusa **sin reimplementar reglas**; los componentes de la Fase 3 se alimentan de la `PlayerView` remota.
- [ ] Estados de conexión visibles: conectando, conectado, desconectado.

## Criterios de éxito
La misma UI juega en local y en línea cambiando únicamente la implementación del transporte. Si hizo falta tocar la lógica de presentación para lograrlo, documentar por qué en el PR — es señal de que una invariante se filtró.

**Bloqueada por:** Lobbies.
EOF

issue "Reconexión y recuperación de partida en curso" "$F4" "type: feature,area: api,priority: P1" <<'EOF'
## Contexto
Una partida por turnos sobrevive bien a una desconexión breve, pero solo si el servidor sabe reanudar. Sin esto, cerrar la pestaña por accidente arruina la partida de todos.

## Objetivo
- [ ] Reconectar a una partida en curso con el identificador persistente de jugador.
- [ ] Al reconectar, el servidor reenvía la `PlayerView` actual y el log **filtrado** de ese jugador.
- [ ] Los demás ven el estado de conexión de cada participante.
- [ ] Política explícita ante desconexión prolongada, documentada aunque sea simple (por ejemplo: la partida espera, no se elimina a nadie automáticamente).

## Criterios de éxito
Recargar la pestaña a media partida en línea devuelve al jugador a su sitio, con su conocimiento privado intacto y sin filtrar nada nuevo.

**Bloqueada por:** Cliente en línea.
EOF

echo ""
echo "== Bootstrap completo =="
echo "Revisa el tablero: https://github.com/$REPO/milestones"
