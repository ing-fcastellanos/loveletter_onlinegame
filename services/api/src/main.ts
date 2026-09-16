/**
 * PROVISIONAL — Fase 0.
 *
 * Esqueleto del servidor autoritativo. Existe para dos cosas: que `tsc` tenga un archivo
 * de entrada, y que quede verificado que el subpath de autoridad resuelve desde el
 * servidor sin ningún build previo (ADR 0005).
 *
 * Fastify, WebSocket y PostgreSQL llegan en la Fase 4 (issues #27-#33).
 */

import { project, toSeed } from '@loveletter/engine/server';
import type { GameState } from '@loveletter/engine/server';

// La semilla la genera quien aloja el motor y el motor solo la valida (ADR 0008).
const seed = toSeed(20260911);
if (!seed.ok) {
  process.stderr.write(`semilla inválida: ${seed.error.value}\n`);
  process.exit(1);
}

const state: GameState = {
  seed: seed.value,
  players: [
    { id: 'jugador-1', name: 'Ana', tokens: 0 },
    { id: 'jugador-2', name: 'Beto', tokens: 0 },
  ],
  round: {
    number: 1,
    deck: ['Guard', 'Priest', 'Baron'],
    setAside: 'King',
    faceUp: ['Guard', 'Guard', 'Handmaid'],
    players: [
      { status: 'active', id: 'jugador-1', held: 'Princess', discards: [], protected: false },
      { status: 'active', id: 'jugador-2', held: 'Countess', discards: [], protected: false },
    ],
    turn: { stage: 'draw', player: 'jugador-1' },
  },
  log: [{ type: 'RoundStarted', round: 1, first: 'jugador-1', audience: 'public' }],
};

const view = project(state, 'jugador-1');

process.stdout.write(
  `autoridad: ronda=${state.round.number} mazo=${state.round.deck.length} ` +
    `apartada=${state.round.setAside} | vista del jugador: deckCount=${view.deckCount}\n`,
);
