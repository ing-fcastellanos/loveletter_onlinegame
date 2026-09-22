/**
 * Contrato de efecto y su tabla de despacho (issue #13).
 *
 * Un efecto recibe el estado, quién juega y los parámetros de su comando, y devuelve el
 * mismo resultado que `applyCommand`: un estado (el mismo, o uno nuevo) y sus eventos, o un
 * rechazo. La tabla exige una entrada por cada uno de los ocho personajes —mismo patrón que
 * `DECK_COMPOSITION` en `cards.ts`— así que agregar un personaje sin declarar su efecto no
 * compila.
 *
 * El Guardia y el Sacerdote tienen efecto real desde el issue #14; el Barón y la Sirvienta
 * desde el #15. Príncipe, Rey, Condesa y Princesa siguen apuntando a `noEffect`: el #16 y el
 * #17 reemplazan, uno a uno, cada entrada restante.
 */

import { CARD } from './cards.ts';
import type { CardName } from './cards.ts';
import type { GameEvent } from './event.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import { eliminate, requireActive } from './state.ts';
import type { ActivePlayer, GameState, PlayerId, Round } from './state.ts';
import type { RuleViolation } from './violation.ts';

/** Lo que el comando de descarte trae para el efecto de la carta jugada. */
export type EffectParams = { readonly target?: PlayerId; readonly guess?: CardName };

export type EffectResult = Result<
  { readonly state: GameState; readonly events: readonly GameEvent[] },
  RuleViolation
>;

export type EffectHandler = (
  state: GameState,
  player: PlayerId,
  params: EffectParams,
) => EffectResult;

/** El resultado explícito de un efecto sin comportamiento implementado: nada cambia. */
function noEffect(state: GameState, _player: PlayerId, _params: EffectParams): EffectResult {
  return ok({ state, events: [] });
}

/** Objetivo legal para el Guardia y el Sacerdote: activo, no protegido, distinto de `self`. */
function legalTargets(round: Round, self: PlayerId): readonly PlayerId[] {
  return round.players
    .filter(
      (candidate): candidate is ActivePlayer =>
        candidate.status === 'active' && candidate.id !== self && !candidate.protected,
    )
    .map((candidate) => candidate.id);
}

/**
 * Valida el objetivo de una carta que lo exige. `null` significa que ningún jugador cumple
 * las condiciones: la carta se descarta sin efecto, no es una jugada ilegal.
 */
function resolveTarget(
  round: Round,
  player: PlayerId,
  target: PlayerId | undefined,
): Result<ActivePlayer | null, RuleViolation> {
  const targets = legalTargets(round, player);
  if (targets.length === 0) {
    return ok(null);
  }
  if (target === undefined) {
    return err({ code: 'MissingTarget', player });
  }
  if (!targets.includes(target)) {
    return err({ code: 'IllegalTarget', player, target });
  }
  return ok(requireActive(round, target));
}

function resolveGuard(state: GameState, player: PlayerId, params: EffectParams): EffectResult {
  const resolved = resolveTarget(state.round, player, params.target);
  if (!resolved.ok) {
    return resolved;
  }
  const target = resolved.value;
  if (target === null) {
    return ok({ state, events: [] });
  }
  if (params.guess === undefined || params.guess === 'Guard') {
    return err({ code: 'InvalidGuess', player });
  }

  const hit = target.held === params.guess;
  const guessed: GameEvent = {
    type: 'GuardGuessed',
    player,
    target: target.id,
    guess: params.guess,
    hit,
    audience: 'public',
  };

  if (!hit) {
    return ok({ state: { ...state, log: [...state.log, guessed] }, events: [guessed] });
  }

  const players = state.round.players.map((candidate) =>
    candidate.id === target.id ? eliminate(target) : candidate,
  );
  const playerEliminated: GameEvent = {
    type: 'PlayerEliminated',
    player: target.id,
    audience: 'public',
  };

  return ok({
    state: {
      ...state,
      round: { ...state.round, players },
      log: [...state.log, guessed, playerEliminated],
    },
    events: [guessed, playerEliminated],
  });
}

function resolvePriest(state: GameState, player: PlayerId, params: EffectParams): EffectResult {
  const resolved = resolveTarget(state.round, player, params.target);
  if (!resolved.ok) {
    return resolved;
  }
  const target = resolved.value;
  if (target === null) {
    return ok({ state, events: [] });
  }

  const peeked: GameEvent = {
    type: 'PriestPeeked',
    player,
    target: target.id,
    card: target.held,
    audience: [player],
  };

  return ok({ state: { ...state, log: [...state.log, peeked] }, events: [peeked] });
}

/**
 * A diferencia del Guardia, el objetivo del Barón nunca se hace público: solo el evento
 * `BaronCompared`, restringido a los dos implicados, lo nombra. Un tercero solo se entera de
 * algo si hay eliminación, vía el `PlayerEliminated` público que ya existe (issue #14) — así
 * que un empate es indistinguible de un Barón sin ningún objetivo legal para cualquiera que
 * no sea uno de los dos implicados.
 */
function resolveBaron(state: GameState, player: PlayerId, params: EffectParams): EffectResult {
  const resolved = resolveTarget(state.round, player, params.target);
  if (!resolved.ok) {
    return resolved;
  }
  const target = resolved.value;
  if (target === null) {
    return ok({ state, events: [] });
  }

  const self = requireActive(state.round, player);
  const compared: GameEvent = {
    type: 'BaronCompared',
    player,
    target: target.id,
    playerCard: self.held,
    targetCard: target.held,
    audience: [player, target.id],
  };

  if (CARD[self.held] === CARD[target.held]) {
    return ok({ state: { ...state, log: [...state.log, compared] }, events: [compared] });
  }

  const loser = CARD[self.held] < CARD[target.held] ? self : target;
  const players = state.round.players.map((candidate) =>
    candidate.id === loser.id ? eliminate(loser) : candidate,
  );
  const playerEliminated: GameEvent = {
    type: 'PlayerEliminated',
    player: loser.id,
    audience: 'public',
  };

  return ok({
    state: {
      ...state,
      round: { ...state.round, players },
      log: [...state.log, compared, playerEliminated],
    },
    events: [compared, playerEliminated],
  });
}

/**
 * Marca a quien juega como protegido. No genera ningún evento propio: la protección de un
 * rival ya se proyecta en vivo en `PlayerView` desde el estado, no desde el log (issue #15).
 * El avance de turno en `command.ts` es quien la limpia, al inicio del turno siguiente de
 * quien la jugó.
 */
function resolveHandmaid(state: GameState, player: PlayerId, _params: EffectParams): EffectResult {
  const self = requireActive(state.round, player);
  const players = state.round.players.map((candidate) =>
    candidate.id === self.id ? { ...self, protected: true } : candidate,
  );

  return ok({ state: { ...state, round: { ...state.round, players } }, events: [] });
}

export const EFFECTS = {
  Guard: resolveGuard,
  Priest: resolvePriest,
  Baron: resolveBaron,
  Handmaid: resolveHandmaid,
  Prince: noEffect,
  King: noEffect,
  Countess: noEffect,
  Princess: noEffect,
} as const satisfies Record<CardName, EffectHandler>;
