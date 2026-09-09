# ADR 0003 — Stack: TypeScript estricto en cliente y servidor

**Status**: Accepted
**Fecha**: 2026-09-08
**Relacionado**: ADR 0002 (monorepo), ADR 0004 (arquitectura del motor)

## Contexto

El PDD fija como primer objetivo técnico el **dominio de TypeScript**: tipado estricto, interfaces genéricas y enums para modelar el estado del juego "con cero ambigüedad". También exige, en la Fase 4, un servidor autoritativo que valide los comandos y una base de datos con **estrategia robusta de versionado de esquemas**, capaz de evitar colisiones de versiones entre entornos (staging y producción).

El linaje de repos de este desarrollador usa Python 3.12 + Flask + Firestore en el backend. Firestore es NoSQL sin migraciones — precisamente la propiedad que aquí *no* sirve, porque el PDD pide ejercitar el problema de las migraciones, no evitarlo.

Opciones evaluadas para el servidor: (1) Node + TypeScript, (2) Python + Flask reusando los patrones ya conocidos, (3) diferir la decisión a un spike en la Fase 4.

## Decisión

| Capa | Tecnología |
|---|---|
| Motor (`packages/engine`) | TypeScript 5 estricto. Cero dependencias de runtime, sin DOM, sin APIs de Node |
| Cliente (`apps/web`) | Vite + TypeScript. La técnica de render (DOM vs Canvas) se decide en su propio ADR en la Fase 3 |
| Servidor (`services/api`) | Node 22+ · TypeScript · Fastify (HTTP) · WebSocket (tiempo real) |
| Persistencia | **PostgreSQL** con migraciones versionadas en archivos, revisadas en PR |
| Tests | Vitest, en los tres paquetes |
| Runtime local | Docker para PostgreSQL; Node nativo para el resto |

**TypeScript estricto** significa, como mínimo: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` y `noFallthroughCasesInSwitch`. Sin `any` implícito ni explícito en `packages/engine`; sin `console.log` en código de producción.

La **estrategia concreta de versionado de migraciones** (nombrado, orden, detección de colisiones entre ramas y entornos) se decide en un ADR propio dentro de la Fase 4, alimentado por un spike. Aquí solo se decide que la persistencia es relacional y con migraciones en archivos: es la premisa que hace posible ese ejercicio.

## Razones

- **Node + TS deja correr el mismo motor en ambos lados.** Es la consecuencia directa del ADR 0002: el servidor valida los comandos con exactamente el mismo código que el cliente usó para proponerlos. Con Python habría dos implementaciones de las reglas, o el motor tras un proceso Node aparte — complejidad sin ganancia.
- **Cumple el objetivo declarado del proyecto.** Un backend en Python demostraría Flask, no TypeScript. El PDD pide lo segundo.
- **PostgreSQL fuerza el problema que el PDD pide resolver.** Firestore no tiene migraciones, así que elegirlo sería esquivar el requisito del Hito 4. Además, lobbies, perfiles e histórico de partidas son datos relacionales con integridad referencial real: es el caso de uso natural de SQL.
- **Fastify sobre Express**: tipado de primera clase, validación de esquemas integrada, y mejor rendimiento en el camino de mensajes — que aquí es el camino caliente.
- **WebSocket sobre polling o SSE**: el juego necesita empuje bidireccional y de baja latencia; SSE es unidireccional y el polling desperdicia el modelo de comandos.
- **Vitest sobre Jest**: comparte la configuración de Vite del cliente, arranca más rápido y entiende TS y ESM sin transpilación extra.

## Alternativas descartadas

- **Python 3.12 + Flask** (lo conocido en los repos hermanos) — obligaría a reimplementar las reglas en un segundo lenguaje o a exponer el motor Node como proceso aparte. Reusaría runbooks a costa del objetivo central del proyecto.
- **Firestore** — sin migraciones; incompatible con el requisito explícito de versionado de esquemas del Hito 4.
- **Diferir el stack del servidor a la Fase 4** — la decisión no es aislable: si el servidor no fuera TypeScript, el motor no tendría por qué ser isomórfico, y esa restricción es justo la que da forma al modelo de datos de la Fase 1. Decidirlo tarde significaría rediseñar hacia atrás.
- **Socket.IO en lugar de WebSocket crudo** — añade reconexión y fallbacks útiles, pero también un protocolo propio encima. Se reconsiderará si la reconexión a mano resulta ser un problema real (ver Re-evaluación).
- **Next.js full-stack** — mezcla presentación y servidor en un deployable; oscurece justo la separación motor/UI/servidor que el proyecto quiere demostrar.

## Consecuencias

**Positivas:** un solo lenguaje y un solo modelo mental de punta a punta; el servidor no puede divergir del cliente en las reglas; PostgreSQL da integridad referencial y un terreno real para practicar migraciones.

**Negativas / trade-offs:** se abandonan los runbooks, el CI y los patrones de despliegue ya rodados en Python del linaje de repos — hay que construirlos de nuevo para Node. Operar PostgreSQL cuesta más que Firestore (hay servidor y hay migraciones que mantener); se acepta porque ese costo *es* el ejercicio.

## Re-evaluación

- Si la reconexión y el estado de sesión sobre WebSocket crudo se vuelven una fuente recurrente de bugs → evaluar Socket.IO en un ADR nuevo.
- Si el proyecto llegara a necesitar despliegue continuo real, revisar si conviene alinear la infraestructura con la de los repos hermanos (Cloud Run) o elegir un PaaS con PostgreSQL gestionado.
