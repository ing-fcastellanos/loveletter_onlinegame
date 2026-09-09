// Conventional Commits en español para el monorepo.
// La convención está descrita en CLAUDE.md ("Convenciones de código"); aquí se hace ejecutable.
// - Tipos: los de CLAUDE.md.
// - Encabezado <= 100 caracteres.
// - subject-case desactivado: las descripciones van en español con mayúsculas y acentos naturales.
// - scope: libre (no error) para no romper scopes compuestos como `engine,web`.
// ESM porque el package.json de la raíz declara "type": "module".
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'revert'],
    ],
    'header-max-length': [2, 'always', 100],
    'subject-case': [0],
    'scope-empty': [0],
    'scope-enum': [0],
  },
};
