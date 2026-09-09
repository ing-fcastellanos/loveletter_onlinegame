/**
 * PROVISIONAL — Fase 0.
 *
 * Esqueleto del servidor autoritativo. Existe para dos cosas: que `tsc` tenga un
 * archivo de entrada, y que quede verificado que el subpath de autoridad resuelve
 * desde el servidor sin ningún build previo (ADR 0005).
 *
 * Fastify, WebSocket y PostgreSQL llegan en la Fase 4 (issues #27-#33).
 */

import { project } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

const state: GameState = {
  deck: ['Guard', 'Priest', 'Princess'],
  setAside: 'King',
  seed: 20260908,
};

const view = project(state, 'jugador-1');

process.stdout.write(
  `autoridad: mazo=${state.deck.length} apartada=${state.setAside} | ` +
    `vista del jugador: deckCount=${view.deckCount}\n`,
);
