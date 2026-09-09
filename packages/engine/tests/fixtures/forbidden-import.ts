// FIXTURE NEGATIVO — este archivo DEBE fallar al verificar tipos.
// Intenta alcanzar el estado autoritativo desde la superficie por defecto del motor.
// Si algún día compila, la frontera del ADR 0005 se rompió y la prueba se pone roja.
import type { GameState } from '@loveletter/engine';

export const leak: GameState | undefined = undefined;
