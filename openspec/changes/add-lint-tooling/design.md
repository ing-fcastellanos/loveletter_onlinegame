## Context

Ver [proposal.md](proposal.md) — Why. El [ADR 0006](../../../docs/decisions/0006-linter-y-formateador-oxlint-prettier.md) ya decidió las herramientas y midió por qué; aquí se decide cómo se organizan.

La restricción que da forma a todo: las tres reglas **no son propiedades de un workspace, son propiedades de la frontera entre workspaces**. "No uses `Math.random()`" aplica al motor y a nadie más; "no importes `/server`" aplica a la UI y a nadie más. Son afirmaciones sobre el monorepo, no sobre un paquete.

## Goals / Non-Goals

**Goals:**

- Que romper una invariante falle en la máquina de quien desarrolla, con un mensaje que diga qué ADR se violó.
- Que el formateo no sea tema de conversación en ningún PR.
- Dejar `lint` y `format:check` listos para que el issue #5 los invoque sin tener que inventarlos.

**Non-Goals:**

- Adoptar un conjunto amplio de reglas de estilo. Se empieza por las invariantes y lo que las sostiene; ampliar es barato y se hace cuando duela algo concreto.

## Decisions

### Una sola configuración en la raíz, acotada por `overrides`

El issue #4 decía "ESLint + Prettier configurados en los tres workspaces". Se hace distinto: **un `.oxlintrc.json` en la raíz**, con las reglas acotadas por globs de directorio.

La razón es la del Context: una configuración por workspace obligaría a que `packages/engine` se prohíba `Math.random()` a sí mismo y `apps/web` se prohíba a sí misma importar `/server`. Eso invierte la lógica — cada paquete custodiando su propia restricción es justamente la disciplina que las reglas existen para no tener que ejercer. En la raíz, las reglas describen el monorepo desde fuera y se leen todas juntas.

**Alternativa descartada**: tres configuraciones locales. Triplica el mantenimiento y dispersa una política que se entiende mejor de un vistazo.

### Los mensajes citan el ADR

Cada regla lleva un mensaje propio que nombra el ADR que la origina, no una explicación genérica. Quien se tope con la regla a las 11 de la noche debe poder ir a leer por qué existe, en vez de desactivarla por parecerle arbitraria.

### Verificación por mutación, como en el change anterior

El criterio de éxito del issue es "introducir a propósito un `Math.random()` en el motor, o un import prohibido en la UI, hace fallar el lint". Se verifica exactamente así, y además al revés: que el mismo `Math.random()` **no** falle fuera del motor, porque una regla que aplica a todo no es la regla que se decidió.

### El formateo inicial va en su propio commit

Reformatear el código existente toca casi todos los archivos. Va en un commit separado del resto del change para que el diff de sustancia sea revisable. En el PR se señala cuál es cuál.

### Prettier no necesita apagar reglas de oxlint

En la combinación ESLint + Prettier hace falta `eslint-config-prettier` para apagar las reglas de estilo que pelean con el formateador. Aquí no aplica: las tres reglas que se activan son de sustancia, no de formato, y no se habilita el conjunto de estilo de oxlint. Si algún día se amplía, hay que revisar este punto.

## Risks / Trade-offs

- **Los fixtures negativos del change anterior contienen código deliberadamente inválido** (`packages/engine/tests/fixtures/`) → oxlint no verifica tipos, así que un `enum` ahí no le molesta; pero conviene comprobarlo al configurar y, si molestara, excluir ese directorio del lint (nunca del typecheck, donde su fallo es el propósito).
- **`no-console` podría chocar con código legítimo de arranque** → hoy no hay ninguno: `services/api/src/main.ts` ya usa `process.stdout.write`. Si un día hace falta una excepción, se acota por `overrides`, no se apaga la regla.
- **oxlint es joven comparado con ESLint** → mitigado porque los nombres de regla son compatibles: la intención es portable si hubiera que migrar. Registrado en el ADR 0006.
- **El commit de formateo ensucia `git blame`** → se acepta; es un costo de una sola vez y se puede ignorar con `.git-blame-ignore-revs` si llegara a estorbar.

## Open Questions

- **Dónde vive el requisito de determinismo.** Este change lo añade a `engine-package` porque es hoy la invariante sin ninguna red. Su otra casa posible es el issue #8, que construye el PRNG sembrado y establece el contrato en positivo. No cambia las tareas de este change en ningún caso: la regla de lint se configura igual. Solo cambia en qué change se archiva el requisito.
