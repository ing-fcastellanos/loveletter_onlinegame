## Context

Ver [proposal.md](proposal.md) — Why. El repositorio no tiene código; los ADR [0002](../../../docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md), [0003](../../../docs/decisions/0003-stack-typescript-cliente-y-servidor.md) y [0005](../../../docs/decisions/0005-motor-como-codigo-fuente-y-superficie-de-cliente.md) fijan la forma. Las restricciones duras que este diseño hereda: el motor no tiene build ni dependencias, la superficie por defecto no puede alcanzar el estado autoritativo, y la sintaxis no borrable tiene que fallar al verificar tipos.

El entorno ya fue medido durante la exploración del issue: Node 26.7.0 ejecuta `.ts` sin flags, resuelve subpaths de `exports` a código fuente, y rechaza `enum`; TypeScript 7.0.2 acepta `erasableSyntaxOnly` y `allowImportingTsExtensions`, y hace cumplir la frontera del `exports` con `TS2305`.

## Goals / Non-Goals

**Goals:**

- Que la frontera de información oculta quede verificada por una prueba automatizada, no por revisión humana.
- Que un clon fresco corra `npm install && npm test && npm run typecheck` sin ningún paso intermedio.
- Que la configuración del compilador sea una sola, compartida, y que cada workspace solo declare lo propio de su entorno.

**Non-Goals:**

- Elegir la forma definitiva de los tipos del dominio. Aquí nacen como marcadores mínimos; el issue #7 los reemplaza.
- Optimizar tiempos de build o arranque. No hay build, y el volumen no lo amerita.

## Decisions

### Nombres y superficie del paquete

Scope `@loveletter/*`: `@loveletter/engine`, `@loveletter/web`, `@loveletter/api`. Legible y sin ambigüedad frente a un `@ll` cifrado.

El `exports` del motor, con el default del lado seguro (ADR 0005):

```jsonc
"exports": {
  ".":        { "types": "./src/client.ts", "default": "./src/client.ts" },
  "./server": { "types": "./src/server.ts", "default": "./src/server.ts" }
}
```

`src/client.ts` y `src/server.ts` son barriles: no contienen lógica, solo deciden qué sale. Los módulos internos (`state.ts`, `project.ts`, …) no se publican, así que reorganizarlos por dentro no rompe a nadie.

**Alternativa descartada**: un `exports` único más una regla de ESLint. Deja la invariante en una herramienta desactivable por línea, y fue explícitamente degradada a segunda línea de defensa en el ADR 0005.

### Cómo se prueba que la frontera existe

Una prueba positiva no basta: hay que demostrar que el import prohibido **no compila**. Se hace con un *fixture* de tipos negativo — un archivo que intenta el import prohibido, fuera del `include` del typecheck normal, y una prueba de Vitest que ejecuta el compilador sobre él y exige que falle con `TS2305`.

Es la única forma de que la invariante del ADR 0004 tenga una prueba en verde que se ponga roja si alguien amplía el barril de cliente por descuido.

**Alternativa descartada**: una librería de aserciones de tipos (`tsd`, `expect-type`). Añade una dependencia para algo que el propio compilador ya reporta, y no verifica el `exports` real del paquete sino los tipos en abstracto.

### Configuración de TypeScript

Un `tsconfig.base.json` en la raíz con el conjunto estricto y el del ADR 0005. Cada workspace extiende y solo declara lo suyo: `apps/web` añade la librería del DOM, `services/api` la del servidor, y **`packages/engine` no añade ninguna de las dos** — así, referirse a `document` o a `process` desde el motor es un error de compilación, no una convención.

Sin *project references* ni `composite`. Con el motor distribuido como fuente, cada workspace resuelve los `.ts` del otro directamente y puede verificarse solo; las referencias solo agregarían orden de build donde no hay build.

**Alternativa descartada**: `moduleResolution: "bundler"`. Es más cómodo (permite omitir extensiones) pero deja pasar imports que Node rechaza al ejecutar. Se prefiere que el compilador exija lo mismo que el runtime.

### Node ≥ 24

El type-stripping sin flags existe desde Node 23, pero se declara `>=24` para quedar sobre una línea LTS en vez de una impar de vida corta. Hay que corregir el `engines` de la raíz, que hoy dice `>=22` — con Node 22 nada de esto funciona.

### Vitest

Configuración por workspace, orquestada desde la raíz. `packages/engine` corre en entorno neutro (sin DOM), coherente con su restricción de no depender de ningún entorno. Se habilita el reporte de cobertura sin umbral: medir desde el inicio, exigir cuando haya reglas que cubrir.

### Los tipos de la Fase 0 son marcadores, y se dice en el código

Para demostrar la frontera hace falta al menos un símbolo de cada lado. Nacen aquí un `GameState`, un `PlayerView` y un `project` **mínimos**, con un comentario que los declara provisionales y apunta al issue #7. No modelan el juego: existen para que la prueba de frontera tenga algo que probar.

Por la regla de diseño del proyecto, se deja declarado desde ya qué oculta `PlayerView`, aunque su contenido real llegue en la Fase 1: **nunca** el mazo (solo su conteo), **nunca** la carta apartada en ninguna forma, y **nunca** la mano de otro jugador salvo lo que ese jugador haya llegado a conocer por un efecto.

### `services/api` esqueletado sin romper el typecheck

`tsc` falla si un proyecto no tiene archivos de entrada, así que un workspace verdaderamente vacío rompe `npm run typecheck` desde el primer día. Recibe un único módulo que importa desde `@loveletter/engine/server` — con lo que, de paso, verifica que el subpath de autoridad resuelve desde el lado del servidor.

## Risks / Trade-offs

- **`typescript-eslint` podría ir detrás de TypeScript 7** → No bloquea este change (ESLint es el issue #4), pero hay que verificarlo ahí antes de comprometerse; la salida es pinear TypeScript 5.x si hiciera falta.
- **Vitest tiene que digerir imports con extensión `.ts` y el `exports` a fuente** → Se verifica en la primera tarea que monta el runner, antes de escribir la prueba de frontera. Si fallara, la alternativa es ejecutar el fixture negativo con el compilador desde un script de npm en vez de desde Vitest.
- **Atarse a Node ≥ 24 estrecha los destinos de despliegue de la Fase 4** → Aceptado y ya registrado en la re-evaluación del ADR 0005; la salida documentada es el mundo compilado.
- **Los tipos marcador podrían sobrevivir más de lo debido y confundirse con el modelo real** → El comentario en el código nombra el issue #7, y ese issue los reemplaza como primera tarea.
- **Un barril de cliente que crezca por descuido filtraría información** → Es exactamente lo que la prueba de frontera negativa vigila; por eso es una tarea de este change y no del issue #4.
