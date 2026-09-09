# ADR 0002 — Monorepo con npm workspaces y motor compartido

**Status**: Accepted
**Fecha**: 2026-09-08
**Relacionado**: ADR 0003 (stack), ADR 0004 (arquitectura del motor)

## Contexto

El motor de reglas de Love Letter tiene que ejecutarse en **dos lugares distintos**: en el navegador durante las Fases 1–3 (juego local, sin servidor) y en el servidor autoritativo desde la Fase 4 (multijugador, donde el cliente no es de fiar). Si las reglas viven duplicadas en ambos lados, divergen — y una divergencia entre la validación del cliente y la del servidor es, en un juego con información oculta, un agujero de trampa.

El repo hermano `strategojuegos` tiene una regla explícita: _"No crees `packages/`, `libs/` ni `shared/` sin ADR"_. Ese repo la justifica bien: sus deployables (`apps/web`, `apps/admin`, `services/api`) no comparten código — el front es TypeScript y el backend es Python, y el acoplamiento de un paquete común solo habría añadido tooling sin beneficio.

Aquí la situación es la inversa: **compartir el motor es el objetivo del proyecto**, no un accidente. Este ADR existe precisamente para satisfacer esa cláusula "sin ADR".

Opciones evaluadas:

1. **npm workspaces** con `packages/engine` consumido por `apps/web` y `services/api`.
2. **Sin workspaces**, motor dentro de `apps/web`, extraído o duplicado al llegar la Fase 4.
3. **Repo plano** (`src/` único, sin monorepo), reestructurado en la Fase 4.
4. **Nx / Turborepo** para orquestar builds y caché.

## Decisión

Monorepo con **npm workspaces** (los que ya trae npm 11, sin herramienta adicional) y esta estructura:

```
loveletter_onlinegame/
├── packages/engine/    motor de reglas — TS puro, CERO dependencias de runtime
├── apps/web/           cliente navegador (Fase 3) — solo presentación e input
├── services/api/       servidor autoritativo + BD (Fase 4)
├── docs/decisions/     ADRs numerados monotónicamente (única ubicación)
├── openspec/           specs (fuente de verdad) + changes
└── scripts/github/     bootstrap de labels, milestones e issues
```

Reglas duras que acompañan a la estructura:

- **`packages/engine` no depende de nada.** Ni DOM, ni APIs de Node (`fs`, `crypto`, `process`), ni librerías de runtime. Si necesita aleatoriedad, la recibe inyectada (ver ADR 0004). Esto es lo que le permite correr idéntico en ambos entornos, y de paso lo hace trivial de testear.
- **Las reglas del juego viven solo ahí.** Ni `apps/web` ni `services/api` implementan lógica de juego: la consumen. Una validación de regla escrita fuera de `packages/engine` es un bug, no un atajo.
- **La dependencia es unidireccional**: `apps/web → packages/engine` y `services/api → packages/engine`. El motor nunca importa de sus consumidores.
- No se crean `libs/` ni `shared/` genéricos. Un paquete nuevo en `packages/` necesita su propio ADR.

## Razones

- npm workspaces resuelve el enlace local (`packages/engine` resoluble por nombre desde ambos consumidores) sin instalar nada: npm 11 ya está en la máquina y no hay una herramienta más que aprender, configurar o mantener.
- La opción 2 (motor dentro de `apps/web`) posterga el trabajo pero no lo evita: el PDD marca explícitamente la Fase 4 como _transición_ a cliente-servidor, no como reescritura. Extraer un motor ya enredado con código de UI es justo el refactor doloroso que el diseño busca evitar.
- La opción 3 tiene el mismo problema, amplificado a todo el repo.
- Nx/Turborepo aportan caché de builds y grafos de tareas: valor real en monorepos de decenas de paquetes y minutos de build. Aquí hay tres paquetes y un build de segundos — sería ceremonia pura, y contradice el criterio del linaje de repos de no meter tooling sin beneficio demostrable.

## Alternativas descartadas

- **Motor dentro de `apps/web`** — condena la Fase 4 a una extracción con el motor ya acoplado a la UI.
- **Repo plano sin monorepo** — más rápido hoy, reestructuración completa en la Fase 4.
- **Nx / Turborepo** — resuelven problemas de escala que este repo no tiene.
- **Dos implementaciones del motor** (una TS en el cliente, otra en el servidor) — descartada de plano: divergencia garantizada entre validaciones, y en un juego de información oculta eso es un vector de trampa.

## Consecuencias

**Positivas:** una sola implementación de las reglas, validada igual en cliente y servidor; el motor es testeable sin navegador, sin servidor y sin mocks; la Fase 4 se vuelve un problema de transporte y persistencia, no de lógica de juego.

**Negativas / trade-offs:** se rompe deliberadamente la simetría con `strategojuegos`, así que quien venga de ese repo encontrará aquí un `packages/` que allá está prohibido — este ADR es la explicación. Los workspaces obligan a disciplina en los `exports` del paquete y complican un poco la resolución de módulos entre Vite (navegador) y Node (servidor), que se resuelve en el change de scaffolding.

## Re-evaluación

- Si aparece un tercer consumidor del motor (por ejemplo un bot de IA como servicio aparte), revisar si `packages/` necesita más de un paquete y con qué límites.
- Si el build supera el minuto o el grafo de dependencias deja de ser obvio a simple vista, reconsiderar Turborepo.
