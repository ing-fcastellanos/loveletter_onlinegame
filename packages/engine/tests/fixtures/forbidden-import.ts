// FIXTURE NEGATIVO — este archivo DEBE fallar al verificar tipos.
// Intenta alcanzar el estado autoritativo y el estado de ronda desde la superficie por
// defecto del motor: contienen la carta de cada rival, la carta robada y el mazo. Si algún
// día compila, la frontera del ADR 0005 se rompió y la prueba se pone roja.
import type { GameState, Round, RoundPlayer, Turn } from '@loveletter/engine';
import { handOf } from '@loveletter/engine';

export const leak: GameState | Round | RoundPlayer | Turn | undefined = undefined;
export const leakAccessor = handOf;
