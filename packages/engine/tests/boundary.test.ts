/**
 * Pruebas de la frontera del paquete (ADR 0005, capability `engine-package`).
 *
 * Una prueba positiva no demuestra que una frontera existe: hay que demostrar que
 * lo prohibido NO COMPILA. Por eso estas pruebas ejecutan el compilador sobre
 * fixtures que deben fallar, y exigen el código de error exacto.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const tscEntry = fileURLToPath(
  new URL('../../../node_modules/typescript/lib/tsc.js', import.meta.url),
);

function typecheck(project: string): { code: number; output: string } {
  const result = spawnSync(process.execPath, [tscEntry, '--noEmit', '-p', project], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return { code: result.status ?? -1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/** Nombres que la superficie por defecto no debe exponer: todos dan acceso a información oculta. */
const AUTHORITY_ONLY = ['GameState', 'Round', 'RoundPlayer', 'Turn', 'handOf'] as const;

describe('la superficie por defecto no expone estado oculto', () => {
  it('alcanzar el estado autoritativo o el de ronda desde la superficie por defecto no compila', () => {
    const { code, output } = typecheck('packages/engine/tests/fixtures/tsconfig.forbidden.json');

    expect(code).not.toBe(0);

    // TS2305 ("has no exported member") o TS2724, que dice lo mismo cuando el compilador
    // encuentra un nombre parecido que sugerir: con `handOf` propone `Hand`. En ambos
    // casos el nombre no existe en la superficie por defecto.
    const missing = output.split('\n').filter((line) => /error TS(2305|2724):/.test(line));
    for (const name of AUTHORITY_ONLY) {
      expect(
        missing.some((line) => line.includes(`'${name}'`)),
        name,
      ).toBe(true);
    }
  }, 60_000);
});

describe('el código del motor usa solo sintaxis borrable', () => {
  it('una construcción no borrable se rechaza al verificar tipos', () => {
    const { code, output } = typecheck('packages/engine/tests/fixtures/tsconfig.non-erasable.json');

    expect(code).not.toBe(0);
    expect(output).toContain('TS1294');
  }, 60_000);
});
