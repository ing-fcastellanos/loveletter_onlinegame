/**
 * PROVISIONAL — Fase 0.
 *
 * Punto de entrada del cliente. Importa de la superficie POR DEFECTO del motor
 * (`@loveletter/engine`), nunca de `@loveletter/engine/server`: desde aquí el estado
 * autoritativo tiene que ser inalcanzable (ADR 0004, ADR 0005).
 *
 * La interfaz real llega en la Fase 3 (issues #22-#26).
 */

import { CARD } from '@loveletter/engine';

const root = document.querySelector('#app');
if (root !== null) {
  root.textContent = `Motor enlazado — la Princesa vale ${CARD.Princess}.`;
}
