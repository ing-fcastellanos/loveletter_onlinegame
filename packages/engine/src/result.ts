/**
 * Resultado de una operación que las reglas pueden rechazar (ADR 0004).
 *
 * Una jugada ilegal es un valor de retorno, nunca una excepción. Son datos sin métodos:
 * viajan serializados sin reconstrucción, y leer `value` exige comprobar `ok` antes.
 */

export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
