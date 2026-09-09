# ADR 0005 — El motor como paquete de código fuente, con superficie de cliente separada

**Status**: Accepted
**Fecha**: 2026-09-08
**Relacionado**: ADR 0002 (monorepo), ADR 0003 (stack), ADR 0004 (invariantes del motor) · **Resuelve**: #1

## Contexto

El [ADR 0002](0002-monorepo-npm-workspaces-motor-compartido.md) decidió que `packages/engine` se comparte entre navegador y servidor; el [ADR 0003](0003-stack-typescript-cliente-y-servidor.md) fijó el stack; el [ADR 0004](0004-estado-autoritativo-proyecciones-y-determinismo.md) estableció que la UI jamás debe ver `GameState`. Falta decidir **cómo se materializa el paquete**: qué publica en `exports`, si necesita un paso de compilación, y si la invariante de información oculta se sostiene con disciplina o con estructura.

La exploración del issue #1 midió el entorno en vez de suponerlo. Node 26.7.0 y TypeScript 7.0.2:

| Verificación | Resultado |
|---|---|
| Node ejecuta `.ts` sin flags | Sí — type-stripping activo por defecto |
| Node resuelve un workspace cuyo `exports` apunta a `./src/index.ts` | Sí, sin build alguno |
| Node resuelve subpaths de `exports` a código fuente | Sí (`@ll/engine/server` → `./src/server.ts`) |
| Node acepta `enum` | **No** — `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` |
| Imports relativos ejecutando `.ts` | Exigen extensión `.ts`; `./deck` y `./deck.js` fallan |
| `erasableSyntaxOnly` en TS 7 | Sí — el `enum` falla en compilación con `TS1294` |
| El `exports` restringe el acceso a tipos | Sí — `TS2305: Module has no exported member 'GameState'` |

Eso deja dos mundos coherentes y excluyentes: **motor como código fuente** (sin build, imports con extensión `.ts`, sintaxis borrable obligatoria) o **motor compilado** (`tsc` a `dist`, imports con `.js`, `enum` permitido, build antes de cada test y typecheck). Un tercero, híbrido con condiciones de `exports`, ofrece ambos a cambio de la configuración más compleja.

## Decisión

### 1. El motor se distribuye como código fuente, sin paso de compilación

`exports` apunta directamente a los `.ts` de `src/`. Node los ejecuta por type-stripping y Vite los procesa de forma nativa. No hay `dist`, no hay build previo a `test` ni a `typecheck`, y no existe la clase de bug en que el `dist` va desfasado del fuente.

### 2. Sintaxis borrable obligatoria: `erasableSyntaxOnly`

Quedan prohibidos `enum`, `namespace` y las propiedades de parámetro en constructores. **Esto contradice la letra del PDD**, que pide "enums para modelar el estado del juego con cero ambigüedad". Se cumple su objetivo con objetos constantes y uniones literales:

```ts
const CARD = { Guard: 1, Priest: 2, /* … */ Princess: 8 } as const;
type CardName  = keyof typeof CARD;
type CardValue = (typeof CARD)[CardName];
```

La bandera `erasableSyntaxOnly` convierte la restricción de Node en un error de compilación: se descubre al escribir, no al ejecutar.

### 3. El `exports` parte la superficie, y el default es el seguro

```
  "."         →  PlayerView, Command, legalMoves     (superficie segura)
  "./server"  →  GameState, applyCommand, project    (autoridad completa)
```

`apps/web` importa `@ll/engine`; `services/api` y las pruebas del motor importan `@ll/engine/server`. La invariante central del ADR 0004 deja de depender de una convención y pasa a ser la frontera del paquete: intentar `GameState` desde la superficie segura es `TS2305`.

Los nombres van en ese orden a propósito. El import corto y cómodo es el que no puede filtrar información; llegar al estado completo obliga a escribir `/server`, un acto deliberado y visible en el diff.

Esto es posible porque **`legalMoves` se calcula íntegramente desde una `PlayerView`**: la mano propia está en la vista, y quién está eliminado o protegido por Sirvienta es información pública (la Sirvienta se juega boca arriba). Ninguna regla de legalidad depende de información oculta. El cliente enumera jugadas legales con el mismo código del motor, sin ida y vuelta al servidor, y el servidor revalida contra el estado completo.

### 4. Configuración del compilador que sostiene lo anterior

`module` y `moduleResolution` en `nodenext`, más `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit` y `erasableSyntaxOnly`. Los imports relativos dentro del motor llevan extensión **`.ts`**.

Se elige `nodenext` sobre `bundler` precisamente porque es el más estricto de los dos: `bundler` permite omitir la extensión, lo que compilaría bien y luego reventaría en Node. Aquí el compilador tiene que exigir lo mismo que exige el runtime.

## Razones

- Sin build, el motor es lo que el ADR 0002 prometió: TypeScript puro que corre igual en ambos lados. Un `dist` intermedio agrega una máquina que hay que mantener, sincronizar y depurar, y no compra nada — este paquete no se publica.
- El `exports` partido convierte la invariante más importante del proyecto en un error del compilador. Una regla de linter se apaga con un comentario; una frontera de módulos, no.
- Poner la superficie segura en el default aplica el principio de que lo correcto debe ser también lo cómodo. Si `@ll/engine` diera el estado completo, la ruta de menor esfuerzo sería la insegura.
- Perder `enum` es, para este dominio, una mejora: las uniones literales dan exhaustividad real en los `switch` y estrechamiento más preciso, sin el mapeo bidireccional en runtime ni la laxitud histórica del `enum` numérico. El PDD pide "cero ambigüedad"; esto lo cumple mejor que aquello que nombra.
- Todo lo anterior está medido en este entorno, no supuesto.

## Alternativas descartadas

- **Motor compilado a `dist`** — convención conocida, portable y publicable, y permitiría `enum`. Se descarta por el costo permanente: build antes de cada `test` y `typecheck`, watch mode que mantener, y la categoría entera de bugs por `dist` desactualizado. Nada de eso se paga con un beneficio real aquí.
- **Híbrido con condiciones de `exports`** (`development` → fuente, `default` → `dist`) — da ambos mundos a cambio de la configuración más difícil de razonar de las tres. Reservado por si algún día hace falta publicar.
- **Conservar `enum`** — obligaría al mundo compilado. La letra del PDD no justifica esa máquina cuando su objetivo se cumple mejor sin ella.
- **`exports` único más regla de ESLint** — era el plan original del issue #4. Funciona, pero deja la invariante en manos de una herramienta que se puede desactivar por línea. La regla de lint se conserva, degradada a segunda línea de defensa: prohibir el especificador `@ll/engine/server` dentro de `apps/web`.
- **Nombrar los subpaths `.` (completo) y `./client` (seguro)** — fue la primera forma considerada. Se invirtió al notar que el `exports` no impide importar la raíz: quien quisiera el estado completo solo tenía que escribir menos. Con el orden actual, la comodidad juega a favor de la invariante.
- **`moduleResolution: "bundler"`** — más permisivo y cómodo, pero deja pasar imports sin extensión que Node rechaza en runtime. Se prefiere que falle en compilación.

## Consecuencias

**Positivas:** no hay build que mantener ni `dist` que se desfase; la invariante de información oculta la vigila el compilador; el cliente enumera jugadas legales con el código real del motor, sin duplicar reglas ni exponer estado.

**Negativas / trade-offs:** el proyecto queda atado a runtimes que hacen type-stripping (Node ≥ 23), lo que en la Fase 4 significa un servidor de producción ejecutando TypeScript crudo — poco convencional, aunque soportado. La extensión `.ts` en imports relativos sorprende a quien viene de la convención `.js` de NodeNext. Y se documenta una desviación explícita del PDD en el asunto de los `enum`, que hay que poder defender.

## Re-evaluación

- Si el motor alguna vez necesita publicarse en un registro, o consumirse desde un runtime sin type-stripping → volver al mundo compilado o al híbrido con condiciones de `exports`.
- Si aparece una regla de legalidad que dependa de información oculta → el `exports` partido deja de sostenerse tal cual y hay que revisar dónde vive `legalMoves`.
- Si `erasableSyntaxOnly` estorba de forma recurrente y demostrable (no meramente incómoda) → reconsiderar el mundo compilado.
