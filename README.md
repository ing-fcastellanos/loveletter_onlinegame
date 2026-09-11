# Love Letter en línea

[![PR gates](https://github.com/ing-fcastellanos/loveletter_onlinegame/actions/workflows/pr-gates.yml/badge.svg)](https://github.com/ing-fcastellanos/loveletter_onlinegame/actions/workflows/pr-gates.yml)

<!-- El badge depende del nombre del archivo del workflow: renombrar
     .github/workflows/pr-gates.yml rompe esta imagen en silencio. -->

Implementación digital del juego de mesa **Love Letter** (edición clásica, 16 cartas, 2–4 jugadores), construida desde cero en TypeScript.

> **Proyecto de entrenamiento.** No es un producto comercial y no está afiliado ni respaldado por Seiji Kanai, Z-Man Games ni Alderac Entertainment Group. _Love Letter_ es propiedad de sus respectivos titulares. Este repositorio reimplementa las reglas con fines de aprendizaje y portafolio; el arte y los textos son propios.

## De qué va

El objetivo no es la fidelidad gráfica: es la **arquitectura**. El proyecto existe para ejercitar lo que se le pide a un Gameplay Developer — modelar un juego de información oculta con tipos estrictos, un motor de reglas desacoplado de la presentación, estado inmutable y flujo unidireccional, y una transición ordenada de partida local a servidor autoritativo.

Tres invariantes gobiernan el diseño y están documentadas en el [ADR 0004](docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md):

1. **La UI nunca ve el estado completo.** El motor produce una `PlayerView` por jugador; lo oculto no aparece censurado sino ausente del tipo (el mazo es un contador, no un arreglo de cartas tapadas). La frontera no es una convención: el `exports` del paquete la impone, y alcanzar `GameState` desde la superficie de cliente es un error de compilación.
2. **Nada de `Math.random()`.** El barajado usa un PRNG sembrado y la semilla vive en el estado: misma semilla y mismos comandos, misma partida carta por carta. De ahí salen los tests deterministas y los replays.
3. **Comando → (estado nuevo, eventos).** Es el mismo contrato en local y en línea, así que el multijugador es un problema de transporte, no una reescritura del motor.

## Estructura

```
├── packages/engine/    motor de reglas — TS puro, cero dependencias, sin DOM ni Node
├── apps/web/           cliente en navegador — solo presentación e input
├── services/api/       servidor autoritativo + PostgreSQL
├── docs/decisions/     ADRs
├── openspec/           specs y changes (spec-driven development)
└── scripts/github/     bootstrap del tablero
```

Monorepo con npm workspaces — el porqué, en el [ADR 0002](docs/decisions/0002-monorepo-npm-workspaces-motor-compartido.md).

## Estado

En construcción. El avance se sigue por [milestones](../../milestones), uno por fase del [ROADMAP](ROADMAP.md):

| Fase                       | Contenido                                                     |
| -------------------------- | ------------------------------------------------------------- |
| 0 — Fundaciones            | Monorepo, TypeScript estricto, Vitest, CI, tablero            |
| 1 — Modelado y core engine | Tipos, mazo, barajado determinista, setup, ciclo de turno     |
| 2 — Efectos y reglas       | Las 8 cartas, validadores previos, condiciones de victoria    |
| 3 — UI y persistencia      | Render reactivo a eventos, controles, autoguardado versionado |
| 4 — Backend y multijugador | Servidor autoritativo, WebSocket, PostgreSQL con migraciones  |

La Fase 0 está completa: monorepo, TypeScript estricto, pruebas de contrato, lint que hace cumplir las invariantes, CI con cuatro checks y `main` protegida en el servidor. La Fase 1 empezó por el modelo del estado, en el que los estados que el juego no admite no compilan; todavía no hay ninguna regla del juego.

## Cómo se trabaja aquí

Todo cambio de comportamiento pasa por **spec-driven development** con [OpenSpec](https://github.com/Fission-AI/OpenSpec): `explore → propose → apply → archive`. El propose es el compromiso; sin él no hay implementación. Las decisiones no triviales se registran como ADRs inmutables. El detalle está en el [ADR 0001](docs/decisions/0001-proceso-openspec-adrs-github.md) y las convenciones para agentes IA en [CLAUDE.md](CLAUDE.md).

## Setup

```bash
npm install
```

Instala el tooling de convenciones y activa los hooks de git. Requiere Node 24 o superior.

## Licencia

Sin licencia de distribución: código publicado para consulta y revisión, no para reutilización comercial.
