# Índice de ADRs

Única ubicación de ADRs del proyecto. Numeración monotónica. Un ADR `Accepted` es inmutable: los cambios de decisión se registran en un ADR nuevo que marca al anterior como `Superseded`. **Este índice se actualiza en el mismo PR que crea o supersede un ADR.**

| #                                                                | Título                                                                     | Status   | Fecha      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-proceso-openspec-adrs-github.md)                     | Proceso de trabajo: OpenSpec + ADRs + GitHub                               | Accepted | 2026-09-08 |
| [0002](0002-monorepo-npm-workspaces-motor-compartido.md)         | Monorepo con npm workspaces y motor compartido                             | Accepted | 2026-09-08 |
| [0003](0003-stack-typescript-cliente-y-servidor.md)              | Stack: TypeScript estricto en cliente y servidor                           | Accepted | 2026-09-08 |
| [0004](0004-estado-autoritativo-proyecciones-y-determinismo.md)  | Estado autoritativo, proyecciones por jugador y determinismo               | Accepted | 2026-09-08 |
| [0005](0005-motor-como-codigo-fuente-y-superficie-de-cliente.md) | El motor como paquete de código fuente, con superficie de cliente separada | Accepted | 2026-09-08 |
| [0006](0006-linter-y-formateador-oxlint-prettier.md)             | Linter y formateador: oxlint + Prettier, sin ESLint                        | Accepted | 2026-09-09 |

## ADRs previstos (nacerán de fases del ROADMAP)

- **Técnica de render de la UI** — DOM vs Canvas, decidido con un prototipo en la Fase 3 (ADR 0003 lo deja explícitamente abierto).
- **Formato y versionado del estado serializado** — `schemaVersion` y política de migración del guardado en `localStorage` (Fase 3).
- **Estrategia de versionado de migraciones de base de datos** — nombrado, orden y prevención de colisiones entre ramas y entornos; sale de un spike de la Fase 4 y es requisito explícito del PDD.
- **Modelo de identidad y sesión** — cómo se identifica un jugador en un lobby (Fase 4).
