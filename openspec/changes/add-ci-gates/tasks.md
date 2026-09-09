## 1. Esqueleto del workflow

- [ ] 1.1 Crear `.github/workflows/pr-gates.yml` con los disparos `pull_request` y `push` a `main`, `permissions: contents: read`, y `concurrency` con `cancel-in-progress` agrupado por rama; verificar que el archivo es YAML válido y que GitHub lo lista en la pestaña Actions.
- [ ] 1.2 Definir el paso común de preparación —`actions/checkout`, `actions/setup-node` con `node-version: '24'` y `cache: npm`, y `npm ci`— con un comentario que apunte a `engines.node` como el valor que debe mantenerse en sincronía; verificar que el paso resuelve y que la caché reporta acierto en la segunda ejecución.

## 2. Los tres jobs que ejecutan comandos existentes

- [ ] 2.1 Job `typecheck` que corre `npm run typecheck`; verificar que aparece con ese nombre exacto en los checks del PR.
- [ ] 2.2 Job `test` que corre `npm test`; verificar que aparece y que ejecuta los tres workspaces (8 pruebas, incluidas las de frontera que lanzan el compilador).
- [ ] 2.3 Job `lint` que corre `npm run lint` **y** `npm run format:check`; verificar que ambos pasos aparecen en el log del mismo check.
- [ ] 2.4 Añadir `timeout-minutes` a los tres; verificar que el valor es holgado frente a la duración real observada.

## 3. El job `commit-convention`

- [ ] 3.1 Job `commit-convention` que valida el título del PR con `npx commitlint` usando el `commitlint.config.js` del repositorio; el título se pasa **por `env`**, nunca interpolado en el `run` (ver `design.md` — es una vía de inyección de shell). Verificar leyendo el YAML que no hay ninguna interpolación `${{ }}` dentro de una línea de comando.
- [ ] 3.2 Condicionar el job a que el evento sea `pull_request`; verificar que en un `push` a `main` el workflow corre los otros tres y omite este.

## 4. Badge y documentación

- [ ] 4.1 Añadir el badge de estado del workflow al `README.md`, con una nota de que depende del nombre del archivo; verificar que la imagen carga y refleja el estado de `main`.
- [ ] 4.2 Retirar de "Cosas que no existen todavía" de `CLAUDE.md` la línea sobre el CI, y anotar los nombres de los cuatro checks para que el issue #6 los tenga a mano; verificar que no queda ninguna afirmación falsa en ese archivo (regla anti-deriva).

## 5. Verificación en un PR real

- [ ] 5.1 Abrir el PR de este change y confirmar que aparecen los **cuatro** checks con los nombres esperados y que los cuatro pasan; pegar la lista real.
- [ ] 5.2 Cambiar temporalmente el título del PR por uno que no cumpla la convención (por ejemplo `arreglos varios`), confirmar que `commit-convention` se pone **rojo**, y restaurar el título; pegar el mensaje de error de commitlint.
- [ ] 5.3 Introducir temporalmente una falla —una prueba rota o un `Math.random()` en el motor—, confirmar que el check correspondiente se pone rojo y que los demás siguen verdes, y revertir. Es la demostración de que cuatro jobs separados dicen _qué_ falló, no solo _que_ falló.
- [ ] 5.4 Confirmar tras el merge que el workflow corre en `push` a `main`, que omite `commit-convention`, y que el badge del README pasa a verde.

## 6. Cierre

- [ ] 6.1 Confirmar que los cuatro nombres de check quedan documentados en `CLAUDE.md` para el issue #6, y que ningún job escribe nada (`permissions: contents: read` en todo el workflow).
- [ ] 6.2 Cerrar registrando las desviaciones del plan y `openspec validate add-ci-gates --strict` en verde.
