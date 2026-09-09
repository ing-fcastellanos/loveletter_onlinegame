## 1. Herramientas y configuración base

- [x] 1.1 Añadir `oxlint` y `prettier` como `devDependencies` de la raíz en `package.json`; verificar que `npx oxlint --version` y `npx prettier --version` responden tras `npm install`.
- [x] 1.2 Crear `.prettierrc` con una configuración única para los tres workspaces y `.prettierignore` cubriendo `node_modules/`, `dist/`, `coverage/` y `package-lock.json`; verificar con `npx prettier --check` sobre un archivo ya conforme.
- [x] 1.3 Añadir los scripts `lint`, `format` y `format:check` a la raíz; verificar que los tres corren y que `format:check` falla ante un archivo mal formateado y pasa tras `format`. **Nota:** la mitad "pasa tras format" solo pudo comprobarse tras la tarea 4.1, porque hasta entonces había otros archivos sin formatear en el repositorio.

## 2. Las reglas que hacen ejecutables las invariantes

- [x] 2.1 Crear `.oxlintrc.json` en la raíz con `no-console` como regla base, y un `override` para `packages/engine/**` con `no-restricted-properties` prohibiendo `Math.random`; el mensaje cita el ADR 0004. Verificar que `npx oxlint` reporta la regla al introducir la llamada.
- [x] 2.2 Añadir el `override` para `apps/web/**` con `no-restricted-imports` prohibiendo `@loveletter/engine/server`; el mensaje cita el ADR 0005. Verificar que se reporta al introducir el import.
- [x] 2.3 Acotar `no-console` para que no aplique a `**/tests/**`; verificar que un `console.log` en una prueba pasa y en `packages/engine/src/` falla.
- [x] 2.4 Comprobar que los fixtures negativos de `packages/engine/tests/fixtures/` no producen ruido en el lint (contienen código inválido a propósito); **Resultado:** no producen ruido en el lint (oxlint no verifica tipos, y el `enum` del fixture no viola ninguna regla activa), así que no hizo falta excluirlos del lint. Sí se excluyeron del **formateo**, para no arriesgar alterar código cuya invalidez es el propósito.

## 3. Verificación de las reglas por mutación

- [x] 3.1 Introducir `Math.random()` en `packages/engine/src/` y verificar que `npm run lint` falla con `no-restricted-properties` y el mensaje que cita el ADR 0004; revertir (Requirement "El motor no consume aleatoriedad ambiental", primer escenario).
- [x] 3.2 Introducir el mismo `Math.random()` en `apps/web/src/` y verificar que `npm run lint` **pasa**: la restricción es del motor, no del repositorio entero; revertir (mismo Requirement, tercer escenario).
- [x] 3.3 Introducir en `apps/web/src/` un import de `@loveletter/engine/server` y verificar que `npm run lint` falla con `no-restricted-imports`; revertir. Es la segunda línea de defensa de la frontera que el `exports` ya impone.
- [x] 3.4 Introducir un `console.log` en `packages/engine/src/` y verificar que falla; moverlo a un archivo bajo `tests/` y verificar que pasa; revertir.

## 4. Formateo del código existente

- [x] 4.1 Ejecutar `npm run format` sobre todo el repositorio y revisar el diff en busca de cambios sospechosos (nada más allá de espaciado, comillas y saltos de línea); **este paso va en un commit propio**, separado del resto del change. **Desviación:** el design no anticipó que Prettier quisiera formatear los archivos **generados** por el CLI de openspec (`.claude/skills/*/SKILL.md` llevan `generatedBy` en su frontmatter) — formatearlos haría que cualquier regeneración rompiera `format:check`. Se añadieron a `.prettierignore` junto con `openspec/changes/archive/` (registro histórico que no se reescribe). El alcance bajó de 30 archivos a 17, todos propios. En código solo cambió un salto de línea; en Markdown, solo relleno de tablas; en las plantillas de issue, las comillas del frontmatter YAML — verificado con un parser que los valores quedan idénticos.
- [x] 4.2 Verificar que tras el formateo `npm run typecheck` y `npm test` siguen pasando: el formateo no puede cambiar comportamiento.

## 5. Documentación

- [x] 5.1 Añadir `lint`, `format` y `format:check` a la sección "Día a día" de `CLAUDE.md`, y retirar de "Cosas que no existen todavía" lo que este change crea; verificar que no queda ninguna afirmación falsa en ese archivo (regla anti-deriva).
- [x] 5.2 Confirmar que el ADR 0006, `openspec/config.yaml` y `docs/decisions/_index.md` ya reflejan la decisión (se actualizaron al escribir el ADR); verificar que no falta ninguno.

## 6. Verificación

- [ ] 6.1 En un clon limpio: `npm install`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm test` pasan; pegar la salida real.
- [ ] 6.2 Confirmar contra los tres escenarios del Requirement añadido en `specs/engine-package/spec.md` que cada uno tiene su verificación por mutación, y anotar cuál cubre a cuál.
- [ ] 6.3 Confirmar que los comandos `lint` y `format:check` quedan listos para que el workflow del issue #5 los invoque tal cual, sin adaptación.
- [ ] 6.4 Cerrar registrando las desviaciones del plan y `openspec validate add-lint-tooling --strict` en verde.
