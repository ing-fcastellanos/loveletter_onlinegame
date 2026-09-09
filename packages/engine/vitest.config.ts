import { defineConfig } from 'vitest/config';

// Entorno neutro a propósito: el motor no depende del navegador ni del servidor,
// y sus pruebas tampoco deben hacerlo (ADR 0002).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'] },
  },
});
