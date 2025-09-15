// ESLint 9 Flat Config для TypeScript-проектов
import tseslint from 'typescript-eslint';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import n from 'eslint-plugin-n';
import promise from 'eslint-plugin-promise';
import eslintConfigPrettier from 'eslint-config-prettier';

const IGNORE = [
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/out/**',
  '**/.turbo/**',
  '**/node_modules/**',
  '**/*.min.*',
  '**/generated/**',
  '**/references/**',
  '**/.DS_Store',
  '**/package-lock.json',
  '**/*.css', // Исключаем CSS файлы из ESLint (используем stylelint для CSS)
  // Временно исключаем проблемный тестовый файл
  '**/SearchConfigPanel.test.tsx',
];

export default [
  // 1) Игноры
  { ignores: IGNORE },

  // 2) Быстрый базовый TS-профиль (без type-check)
  ...tseslint.configs.recommended,

  // 3) Общие окружения/плагины/правила
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      n,
      promise,
    },
    rules: {
      /* Импорты */
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'warn',
      'import/no-mutable-exports': 'error',
      'import/no-unresolved': 'off', // TS + резолвер разрулят

      /* Node / промисы */
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'promise/always-return': 'off',
      'promise/no-nesting': 'off',
      'promise/no-multiple-resolved': 'error',
      'promise/no-return-wrap': 'error',

      /* Чистка импортов */
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
    settings: {
      // ВАЖНО: нужен пакет eslint-import-resolver-typescript
      'import/resolver': {
        // Резолвер TS-путей и алиасов из tsconfig
        typescript: {
          project: ['./tsconfig.eslint.json'], // укажи свой путь/глоб при монорепо
          alwaysTryTypes: true,
        },
        // Резолвер по Node, с нужными расширениями
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
        },
      },
    },
  },

  // 4) TS-блок с type-check правилами (здесь задаём project)
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Замена core-правила
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // Type-aware правила (требуют project)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',

      // Полезные, но не токсичные
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          minimumDescriptionLength: 6,
        },
      ],
      '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
    },
  },

  // 5) d.ts — ослабляем
  {
    files: ['**/*.d.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      'unused-imports/no-unused-imports': 'off',
    },
  },

  // 6) Скрипты/конфиги
  {
    files: ['**/*.config.*', 'scripts/**', 'tools/**'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // 7) Тесты
  {
    files: ['tests/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.tests.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.jest,
        ...globals.vitest,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // '@typescript-eslint/no-floating-promises': 'warn',
    },
  },

  // 9) CSS файлы - отключаем все правила
  {
    files: ['**/*.css'],
    rules: {},
  },

  // 10) Финал — гасим конфликтующие с Prettier правила
  eslintConfigPrettier,
];
