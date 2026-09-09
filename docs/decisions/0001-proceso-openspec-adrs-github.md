# ADR 0001 — Proceso de trabajo: OpenSpec + ADRs + GitHub

**Status**: Accepted
**Fecha**: 2026-09-08
**Relacionado**: ADR 0002 (monorepo), ADR 0003 (stack), ADR 0004 (arquitectura del motor)

## Contexto

Proyecto nuevo y de entrenamiento: una implementación digital de *Love Letter* cuyo objetivo declarado no es la fidelidad gráfica sino demostrar arquitectura de gameplay (máquinas de estado, eventos, estado inmutable) con TypeScript estricto. Lo desarrolla una sola persona asistida por agentes IA, y el resultado se usará como pieza de portafolio para un rol de Gameplay Developer.

Eso impone dos exigencias poco comunes en un proyecto personal: (a) la **trazabilidad requerimiento → spec → código** debe ser visible desde fuera, porque el proceso *es* parte de lo que se está demostrando; y (b) los agentes IA necesitan una fuente de contexto confiable para no reinventar decisiones ya tomadas.

El repo hermano `strategojuegos` (y antes `sociedadsalvaje`) ya operaron este esquema. Su fallo documentado fue la **deriva entre documentación y código**: `CLAUDE.md` y `config.yaml` describiendo stacks que ya no existían, e índices de ADR congelados.

Opciones evaluadas para gestión del trabajo: (1) GitHub Issues + Milestones, (2) Jira (hay conector disponible en el entorno), (3) un `TODO.md` informal en el repo.

## Decisión

1. **OpenSpec** rige todo cambio de comportamiento, con el flujo obligatorio `/opsx:explore → /opsx:propose → /opsx:apply → /opsx:archive`. Las specs en `openspec/specs/<capability>/spec.md` son la fuente de verdad del comportamiento; **el propose es el compromiso — sin propose no hay implementación.**
2. **ADRs** en `docs/decisions/NNNN-titulo.md` (única ubicación), numeración monotónica, plantilla en `_template.md`, índice en `_index.md`. Un ADR `Accepted` es inmutable: se supersede con uno nuevo, nunca se edita la decisión.
3. **GitHub** como tablero: un milestone por fase del [ROADMAP](../../ROADMAP.md); labels en tres ejes (`type:`, `area:`, `priority:`); issues con anatomía Contexto / Objetivo / Criterios de éxito / Bloqueada por. Conventional Commits en español, trunk-based con `main` protegida y squash & merge.
4. **Regla anti-deriva**: el mismo PR que cambia stack, layout o convenciones actualiza `CLAUDE.md`, `openspec/config.yaml`, `README.md` y `_index.md`. Es parte del checklist de cierre de todo PR.
5. **Excepción de proporcionalidad**: correcciones triviales (typo, formato, ajuste de un mensaje) pueden ir con issue + PR sin change de OpenSpec. La regla aplica a cambios de *comportamiento*.

## Razones

- El flujo explore → propose → apply ya demostró en los repos hermanos que produce tareas accionables y evita implementar sin entender el problema.
- En un proyecto cuyo propósito es demostrar criterio de ingeniería, el registro de decisiones descartadas vale tanto como el código: un ADR muestra el razonamiento que un diff no puede mostrar.
- GitHub concentra código, tablero y CI en un solo lugar. Para un equipo de una persona, Jira agrega ceremonia sin beneficio y aleja el tablero del código.
- La regla anti-deriva ataca directamente el fallo conocido del linaje de repos.

## Alternativas descartadas

- **Jira** — pensada para equipos con roles separados; duplicaría el tablero lejos del código y no aporta trazabilidad que GitHub no dé aquí.
- **`TODO.md` informal** — las decisiones se pierden, y los agentes IA reinventan lo ya decidido. Es exactamente el modo de fallo que este proceso existe para evitar.
- **ADRs en dos ubicaciones** (`docs/adr/` + `docs/decisions/`, como quedó en `sociedadsalvaje`) — fuente de confusión conocida; aquí hay una sola.

## Consecuencias

**Positivas:** trazabilidad completa de cada regla del juego hasta su spec y su prueba; los agentes IA tienen contexto confiable; el avance es legible desde fuera por milestone.

**Negativas / trade-offs:** overhead de proceso real en un proyecto pequeño — escribir un propose para "implementar el Sacerdote" cuesta más que escribir el Sacerdote. Se acepta a conciencia: el proceso es parte del entregable. Mitigación: agrupar reglas afines en un solo change (las 8 cartas no son 8 changes) y la excepción de proporcionalidad del punto 5.

## Re-evaluación

- Si entra un segundo desarrollador → revisar branching (review obligatorio, ramas más largas).
- Si el overhead de proceso empieza a frenar el avance del motor de forma medible → revisar la granularidad de los changes antes de abandonar el flujo.
