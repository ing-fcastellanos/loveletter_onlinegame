# ADR 0006 — Linter y formateador: oxlint + Prettier, sin ESLint

**Status**: Accepted
**Fecha**: 2026-09-09
**Relacionado**: ADR 0003 (stack), ADR 0004 (invariantes del motor), ADR 0005 (frontera del paquete) · **Resuelve**: #4

## Contexto

El issue #4 daba por sentado "ESLint + Prettier" — la combinación estándar del ecosistema. La exploración descubrió que esa combinación **no es posible** con el stack que ya opera el repositorio.

El [ADR 0003](0003-stack-typescript-cliente-y-servidor.md) fijó TypeScript, y hoy el repositorio corre con la versión 7, el port nativo. Ese paquete dejó de publicar la API JavaScript del compilador. Medido en este repositorio:

```
node_modules/typescript/  (3.6 MB)
├── lib/tsc.js          → lanza el binario nativo
├── lib/getExePath.js
└── lib/version.cjs

ts.createSourceFile  → undefined
ts.createProgram     → undefined
ts.SyntaxKind        → undefined
```

`typescript-eslint` es, en esencia, un envoltorio de esa API: sin ella no tiene nada que envolver. Su `peerDependency` lo confirma (`typescript >=4.8.4 <6.1.0`), pero el problema no es el rango: aunque lo ampliaran, la API no existe. Y ESLint no puede leer TypeScript sin un parser.

Las invariantes que este proyecto necesita vigilar son tres, y ninguna requiere información de tipos:

1. Prohibir `Math.random()` dentro de `packages/engine` ([ADR 0004](0004-estado-autoritativo-proyecciones-y-determinismo.md)).
2. Prohibir que `apps/web` importe `@loveletter/engine/server` ([ADR 0005](0005-motor-como-codigo-fuente-y-superficie-de-cliente.md)).
3. Prohibir `console.log` fuera de código de prueba.

Se midieron los tres candidatos contra esas invariantes reales:

|                              | ESLint + typescript-eslint | Biome    | oxlint   |
| ---------------------------- | -------------------------- | -------- | -------- |
| Funciona con TypeScript 7    | **No**                     | Sí       | Sí       |
| `Math.random()` en el motor  | Sí                         | **No**   | **Sí**   |
| Import de `/server` en la UI | Sí                         | Sí       | Sí       |
| `console.log`                | Sí                         | Sí       | Sí       |
| Acotar reglas por directorio | Sí                         | Sí       | **Sí**   |
| Formateo                     | Prettier aparte            | Incluido | No tiene |

Biome no expone una regla para propiedades de un global (no existe `noRestrictedProperties`), así que `Math.random()` se le escapa. Prettier, en cambio, resultó inmune al problema: trae sus parsers vendorizados y formatea TypeScript sin tocar el paquete `typescript`.

## Decisión

**oxlint** como linter y **Prettier** como formateador. No se instala ESLint.

Las tres invariantes se expresan con reglas de nombre compatible con ESLint (`no-restricted-properties`, `no-restricted-imports`, `no-console`) y mensajes propios que citan el ADR que las origina. Se acotan por directorio con `overrides`, de modo que la prohibición de `Math.random()` aplique al motor y la de importar `/server` aplique a la UI.

## Razones

- Es la única de las tres opciones que cubre las tres invariantes **y** funciona con el compilador que el repositorio ya usa.
- La invariante que ninguna otra cosa vigila es justamente la que decide: la frontera de `GameState` ya la impone el `exports` y la verifica una prueba (ADR 0005), y `console.log` es higiene. `Math.random()` es el único de los tres que hoy no tiene otra red — y es el que Biome no puede expresar.
- Los nombres de regla compatibles con ESLint hacen la configuración portable: si algún día `typescript-eslint` vuelve a ser viable, la intención se traduce casi literalmente.
- Prettier es el formateador que la mayoría de la gente y de los editores ya conocen, y aquí no arrastra ningún costo: no depende del paquete `typescript`.
- Ambas son herramientas nativas y rápidas, coherentes con haber elegido el compilador nativo.

## Alternativas descartadas

- **Pinear TypeScript 5.x y conservar ESLint + typescript-eslint** — sería la vía conservadora, con el ecosistema más maduro y el linting con información de tipos disponible. Se descarta porque cambiaría el compilador que ya funciona bien aquí para acomodar una herramienta cuyo aporte único, en este repositorio, son tres reglas puramente sintácticas. Ninguna de las invariantes necesita tipos.
- **Biome para todo (lint + formato)** — una sola herramienta, formateo incluido, muy atractivo. Se descarta porque no puede expresar la prohibición de `Math.random()`, que es precisamente la invariante sin otra red.
- **Biome + una prueba de contrato que grepee `Math.random` en el motor** — viable, y coherente con el patrón que ya existe en `packages/engine/tests/contract.test.ts`. Se descarta por ser más piezas para el mismo resultado que oxlint da con una regla.
- **No poner linter y confiar solo en pruebas de contrato** — no cubre el formateo, y pierde la retroalimentación en el editor, que es donde una regla evita el error en vez de reportarlo.

## Consecuencias

**Positivas:** las tres invariantes quedan vigiladas por una herramienta, con mensajes que explican qué ADR se está violando; el repositorio conserva el compilador nativo; el lint y el formateo son casi instantáneos.

**Negativas / trade-offs:** se abandona el ecosistema de plugins de ESLint, que es incomparablemente más grande — si en el futuro se quisiera una regla que solo exista como plugin de ESLint, no habrá dónde enchufarla. Se renuncia también al linting con información de tipos (reglas como "no flotes una promesa"), que hoy ninguna invariante necesita pero que es de las cosas más útiles de typescript-eslint. Y son dos herramientas en vez de una: oxlint no formatea y Prettier no lintea.

## Re-evaluación

- Si `typescript-eslint` publica soporte para el compilador nativo, o si TypeScript vuelve a exponer una API de análisis → reconsiderar, sobre todo si para entonces hacen falta reglas con información de tipos.
- Si aparece una invariante que oxlint no pueda expresar → evaluar añadir una prueba de contrato antes que cambiar de linter.
- Si Biome incorpora una regla para propiedades de globales → reconsiderar la consolidación en una sola herramienta.
