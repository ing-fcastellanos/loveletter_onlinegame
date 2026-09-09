## 1. Esqueleto del workflow

- [x] 1.1 Crear `.github/workflows/pr-gates.yml` con los disparos `pull_request` y `push` a `main`, `permissions: contents: read`, y `concurrency` con `cancel-in-progress` agrupado por rama; verificar que el archivo es YAML válido y que GitHub lo lista en la pestaña Actions.
- [x] 1.2 **Desviación:** no se extrajo a un paso reutilizable — GitHub Actions no permite compartir pasos entre jobs sin una composite action, y crearla para cuatro bloques de tres líneas sería más maquinaria que la que ahorra. Se repiten. Definir el paso común de preparación —`actions/checkout`, `actions/setup-node` con `node-version: '24'` y `cache: npm`, y `npm ci`— con un comentario que apunte a `engines.node` como el valor que debe mantenerse en sincronía; verificar que el paso resuelve y que la caché reporta acierto en la segunda ejecución.

## 2. Los tres jobs que ejecutan comandos existentes

- [x] 2.1 Job `typecheck` que corre `npm run typecheck`; verificar que aparece con ese nombre exacto en los checks del PR.
- [x] 2.2 Job `test` que corre `npm test`; verificar que aparece y que ejecuta los tres workspaces (8 pruebas, incluidas las de frontera que lanzan el compilador).
- [x] 2.3 Job `lint` que corre `npm run lint` **y** `npm run format:check`; verificar que ambos pasos aparecen en el log del mismo check.
- [x] 2.4 Añadir `timeout-minutes` a los tres; verificar que el valor es holgado frente a la duración real observada.

## 3. El job `commit-convention`

- [x] 3.1 Job `commit-convention` que valida el título del PR con `npx commitlint` usando el `commitlint.config.js` del repositorio; el título se pasa **por `env`**, nunca interpolado en el `run` (ver `design.md` — es una vía de inyección de shell). Verificar leyendo el YAML que no hay ninguna interpolación `${{ }}` dentro de una línea de comando. **Verificado** con un script que parsea el YAML y recorre todos los `run`: ninguno contiene `${{`. El comando se probó además en local — `feat: ...` pasa y `arreglos varios` falla con `type-empty` y `subject-empty`.
- [x] 3.2 Condicionar el job a que el evento sea `pull_request`; verificar que en un `push` a `main` el workflow corre los otros tres y omite este.

## 4. Badge y documentación

- [x] 4.1 Añadir el badge de estado del workflow al `README.md`, con una nota de que depende del nombre del archivo; verificar que la imagen carga y refleja el estado de `main`.
- [x] 4.2 Retirar de "Cosas que no existen todavía" de `CLAUDE.md` la línea sobre el CI, y anotar los nombres de los cuatro checks para que el issue #6 los tenga a mano; verificar que no queda ninguna afirmación falsa en ese archivo (regla anti-deriva).

## 5. Verificación en un PR real

- [x] 5.1 Abrir el PR de este change y confirmar que aparecen los **cuatro** checks con los nombres esperados y que los cuatro pasan; pegar la lista real.
- [x] 5.2 Cambiar temporalmente el título del PR por uno que no cumpla la convención (por ejemplo `arreglos varios`), confirmar que `commit-convention` se pone **rojo**, y restaurar el título; pegar el mensaje de error de commitlint. **Esta tarea encontró un defecto de diseño.** Al renombrar, el check siguió en verde: los tipos por defecto de `pull_request` no incluyen `edited`, así que editar el título no vuelve a correr el workflow. Con squash-only y `squash_merge_commit_title = PR_TITLE`, cualquiera podía pasar el check con un título válido y luego cambiarlo a lo que fuera. Corregido con `types: [opened, synchronize, reopened, edited]` y registrado en `design.md`.
- [x] 5.3 Introducir temporalmente una falla —una prueba rota o un `Math.random()` en el motor—, confirmar que el check correspondiente se pone rojo y que los demás siguen verdes, y revertir. Es la demostración de que cuatro jobs separados dicen _qué_ falló, no solo _que_ falló.
- [ ] 5.4 Confirmar tras el merge que el workflow corre en `push` a `main`, que omite `commit-convention`, y que el badge del README pasa a verde.

## 6. Cierre

- [x] 6.1 Confirmar que los cuatro nombres de check quedan documentados en `CLAUDE.md` para el issue #6, y que ningún job escribe nada (`permissions: contents: read` en todo el workflow).
- [x] 6.2 Cerrar registrando las desviaciones del plan y `openspec validate add-ci-gates --strict` en verde.

### Evidencia

**5.1 — Los cuatro checks aparecen y pasan** (ejecución `34314733012`, evento `pull_request`):

```
typecheck: pass · test: pass · lint: pass · commit-convention: pass
```

**5.2 — Encontró un defecto de diseño.** Secuencia medida en el PR #38:

```
05:24:17  run sha=47d3e47                     → success
05:25:11  título → "arreglos varios"          → NINGUNA ejecución   ← el hueco
05:26:22  run sha=fcabbb0 (fix, synchronize)  → commit-convention: fail
```

Con los tipos por defecto de `pull_request`, editar el título no vuelve a correr el workflow. Combinado con squash-only y `squash_merge_commit_title = PR_TITLE`, cualquiera podía pasar el check con un título válido, cambiarlo después a cualquier cosa, y mergear con ese texto como mensaje de `main`.

Corregido con `types: [opened, synchronize, reopened, edited]`. Verificado que la corrección funciona: restaurar el título **sí** disparó una ejecución nueva (`34314940263`), que terminó con los cuatro checks en verde. Antes de la corrección, el mismo gesto no disparaba nada.

**5.3 — Una falla tumba solo su check.** Con un `Math.random()` en `packages/engine/src/state.ts` (violación del ADR 0004, revertida después):

```
lint: fail   ← el único que cae
commit-convention: pass · test: pass · typecheck: pass
```

Cierra el círculo del change anterior: el ADR 0004 lo prohíbe, oxlint lo detecta, y el CI lo rechaza.

**5.4 — Pendiente del merge**: que el workflow corra en `push` a `main`, omita `commit-convention` y el badge se ponga verde. Solo se puede observar una vez integrado.

**6.1 — Nombres de check para el issue #6:** `typecheck`, `test`, `lint` y `commit-convention`, documentados en `CLAUDE.md`. `permissions: contents: read` a nivel de workflow: ningún job escribe nada.

**6.2 — Desviaciones registradas:** tarea 1.2 (los pasos de preparación se repiten en los cuatro jobs porque compartirlos exigiría una composite action) y tarea 5.2 (el defecto del disparo, corregido y registrado también en `design.md`).
