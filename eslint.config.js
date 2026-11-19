import eslint from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const SOURCE_FILES = [
  'src/**/*.{ts,tsx}',
  'server/**/*.ts',
  '__tests__/**/*.{ts,tsx}',
  'vite.config.ts',
];
const TYPE_CHECKED_CONFIGS = tseslint.configs.recommendedTypeChecked.map(
  (configuration) => ({
    ...configuration,
    files: SOURCE_FILES,
  }),
);

export default tseslint.config(
  {
    ignores: ['dist', 'dist-server', 'coverage', 'node_modules'],
  },
  eslint.configs.recommended,
  ...TYPE_CHECKED_CONFIGS,
  {
    files: SOURCE_FILES,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      curly: ['error', 'all'],
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          enforceConst: true,
        },
      ],
      'no-nested-ternary': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement IfStatement',
          message:
            'Nested if statements are prohibited. Use early returns or extract a function.',
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
);
