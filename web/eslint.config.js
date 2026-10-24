// Lint rules for the web app: the language's own, TypeScript's, React's rules of hooks
// (a missing dependency is a stale value waiting to happen) and accessibility.
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/sw.js'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Only real elements carry ARIA roles: a component's own "role" prop (RequireRole) is not one.
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
      // Unused variables are an error, except the deliberately ignored ones written with "_".
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
