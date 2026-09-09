## Why

Los hooks de husky validan en la máquina de quien desarrolla, y se saltan con `--no-verify`. El PR necesita su propia red, que nadie pueda esquivar desde su portátil. En un repositorio público es además la señal visible de que el proyecto está sano — y este repositorio existe, entre otras cosas, para ser mirado.

Hay un motivo nuevo desde que se corrigió la configuración de merge: el repositorio ahora acepta **solo squash**, con `squash_merge_commit_title = PR_TITLE`. El título del PR ya no es una etiqueta: **es literalmente el mensaje de commit que queda en `main`**. Validarlo dejó de ser higiene y pasó a ser la única defensa de la historia del proyecto.

## What Changes

- **`.github/workflows/pr-gates.yml`** con cuatro jobs independientes: `typecheck`, `test`, `lint` y `commit-convention`.
- Los tres primeros ejecutan los comandos que ya existen (`npm run typecheck`, `npm test`, `npm run lint` + `npm run format:check`); no se inventa ninguno.
- **`commit-convention`** valida el título del PR con el `commitlint.config.js` del repositorio — la misma configuración que usa el hook local, no una acción de terceros con sus propias reglas.
- El título llega al job **por variable de entorno**, nunca interpolado en la línea de comandos: es entrada controlada por quien abre el PR y interpolarla es una vía de inyección de shell.
- Disparo en `pull_request` **y en `push` a `main`**, para que el badge tenga estado que mostrar.
- Caché de dependencias, `concurrency` que cancela ejecuciones obsoletas del mismo PR, y permisos mínimos (`contents: read`).
- **Badge de estado** en `README.md`.
- **BREAKING**: ninguno.

## Non-goals

- **Protección de `main` y checks obligatorios** (issue #6): este change produce los cuatro checks; marcarlos como required es aquel. Se separan porque la protección solo se puede configurar con sensatez cuando los checks ya existen y se sabe cómo se llaman.
- **Workflows de despliegue**: no hay nada que desplegar hasta la Fase 4.
- **Umbral de cobertura**: el reporte ya se genera; imponer un mínimo con el motor todavía vacío produciría un número sin significado.
- **Validar los commits individuales del PR**: bajo squash, esos mensajes se descartan al integrar. El hook local ya cuida la higiene de la rama; el CI cuida lo que llega a `main`.

## Capabilities

Ninguna: `skip_specs: true` en `.openspec.yaml`. Un workflow de CI no cambia lo que el sistema hace, sino cómo se verifica el repositorio. Inventar una capability aquí sería fabricar un requisito para satisfacer la validación.

## Impact

- **`.github/workflows/pr-gates.yml`**: archivo nuevo.
- **`README.md`**: badge de estado.
- **`CLAUDE.md`**: retirar de "Cosas que no existen todavía" la línea que dice que no hay CI, y dejar anotados los nombres de los cuatro checks para el issue #6.
- **Ningún cambio de código**: los comandos que el workflow invoca ya existen y ya pasan.
