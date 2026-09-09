// FIXTURE NEGATIVO — este archivo DEBE fallar al verificar tipos.
// `enum` emite código en tiempo de ejecución, y el motor se ejecuta desde su fuente,
// donde Node solo admite sintaxis borrable (ADR 0005).
export enum CardValueEnum {
  Guard = 1,
}
