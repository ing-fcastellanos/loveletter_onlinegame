<!--
Título del PR: Conventional Commits en español (ej. `feat(engine): efecto del Barón`).
Bajo squash & merge, este título se vuelve el mensaje de commit en `main`.
-->

## Resumen

<!-- Qué cambia y por qué, en 2-4 líneas. -->

## Issue

Closes #

## Cómo se probó

<!-- Salida de tests, capturas, semillas usadas. Evidencia real, no "probé y funciona". -->

## Checklist de cierre

- [ ] `npm test` y `npm run typecheck` pasan.
- [ ] Si cambia comportamiento: spec de OpenSpec actualizada en el mismo cambio.
- [ ] Si es un cambio OpenSpec: `openspec validate <change> --strict` pasa.
- [ ] Si toca `packages/engine`: las invariantes del ADR 0004 siguen en pie — la UI no ve `GameState`, no hay `Math.random()`, el estado no se muta en sitio, y `PlayerView` no expone nada que deba estar oculto.
- [ ] Toda regla de juego nueva o modificada lleva su prueba.
- [ ] Si cambia stack/layout/convenciones: ADR nuevo + `CLAUDE.md` + `openspec/config.yaml` + `README.md` + `docs/decisions/_index.md` actualizados.
