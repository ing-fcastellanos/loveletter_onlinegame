/**
 * Contratos de tipo del modelo de estado (capability `game-state`, ADR 0007).
 *
 * No se ejecuta: lo verifica `npm run typecheck`. Cada estado que el juego no admite está
 * escrito como una construcción precedida de `@ts-expect-error`. Si el modelo se afloja y
 * la construcción compila, la directiva queda sin uso y el typecheck falla con TS2578.
 *
 * Una sola construcción por directiva, y cada una en una sola línea: así el único error
 * posible es el buscado.
 */

import type {
  ActivePlayer,
  CardName,
  GameState,
  Player,
  Result,
  Round,
  RoundPlayer,
  RuleViolation,
  Turn,
} from '@loveletter/engine/server';

// ── Lo que el juego admite compila ───────────────────────────────────────────────────────

const ana: ActivePlayer = {
  status: 'active',
  id: 'ana',
  held: 'Guard',
  discards: [],
  protected: false,
};

/** Partida a dos: tres cartas descubiertas y el turno en fase de jugar. */
export const partidaADos: GameState = {
  seed: 1,
  players: [
    { id: 'ana', name: 'Ana', tokens: 0 },
    { id: 'beto', name: 'Beto', tokens: 2 },
  ],
  round: {
    number: 1,
    deck: ['Priest', 'Baron'],
    setAside: 'King',
    faceUp: ['Guard', 'Guard', 'Handmaid'],
    players: [
      ana,
      { status: 'active', id: 'beto', held: 'Prince', discards: ['Guard'], protected: true },
    ],
    turn: { stage: 'play', player: 'ana', drawn: 'Countess' },
  },
};

/** Ronda a tres: sin descubiertas y con un eliminado que conserva sus descartes. */
export const rondaATres: Round = {
  number: 2,
  deck: ['Guard'],
  setAside: 'Princess',
  faceUp: [],
  players: [
    ana,
    { status: 'eliminated', id: 'beto', discards: ['Baron', 'Guard'] },
    { status: 'active', id: 'caro', held: 'Priest', discards: [], protected: false },
  ],
  turn: { stage: 'draw', player: 'ana' },
};

// ── Lo que el juego no admite no compila ─────────────────────────────────────────────────

// @ts-expect-error: una carta ajena a los ocho personajes
export const c1: CardName = 'Joker';

// @ts-expect-error: un jugador activo sin carta
export const p0: ActivePlayer = { status: 'active', id: 'a', discards: [], protected: false };

// @ts-expect-error: un jugador activo con dos cartas, tenga o no el turno
export const p2: ActivePlayer = { ...ana, held: ['Guard', 'Priest'] };

// @ts-expect-error: una carta robada antes de robar
export const t1: Turn = { stage: 'draw', player: 'a', drawn: 'Guard' };

// @ts-expect-error: un jugador eliminado que sostiene una carta
export const e1: RoundPlayer = { status: 'eliminated', id: 'b', discards: [], held: 'Guard' };

// @ts-expect-error: fichas de afecto dentro del estado de ronda
export type RoundTokens = RoundPlayer['tokens'];

// @ts-expect-error: una carta dentro de los datos de partida
export type PlayerHeld = Player['held'];

// @ts-expect-error: descartes dentro de los datos de partida
export type PlayerDiscards = Player['discards'];

// @ts-expect-error: dos cartas descubiertas (solo valen cero o tres)
export const f2: Round['faceUp'] = ['Guard', 'Priest'];

export function mutar(player: Player, jugador: ActivePlayer): void {
  // @ts-expect-error: asignar fichas en sitio
  player.tokens = 3;
  // @ts-expect-error: añadir un descarte en sitio
  jugador.discards.push('Guard');
}

export function valorSinEstrechar(result: Result<number, RuleViolation>): number {
  // @ts-expect-error: leer el valor sin comprobar antes que es un éxito
  return result.value;
}

// @ts-expect-error: una violación con mensaje de texto
export const v1: RuleViolation = { code: 'NotYourTurn', player: 'a', current: 'b', message: '' };
