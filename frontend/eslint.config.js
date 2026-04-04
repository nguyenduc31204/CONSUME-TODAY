import js from '@eslint/js'
import tsEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  // Ignore patterns
  { ignores: ['dist/', 'node_modules/', '*.config.*', 'vite.config.*'] },

  // Base JS config
  js.configs.recommended,

  // TypeScript / React files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        browser: true,
        node: true,
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        RequestInit: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        React: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        HTMLInputElement: 'readonly',
        Image: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        localStorage: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        AbortController: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        __dirname: 'readonly',
        import: 'readonly',
        crypto: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        navigator: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // TypeScript
      ...tsEslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // React Hooks — strict
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // React Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // jsx-a11y — disabled (mobile-first modal sheets use non-native interactive elements)
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-autofocus': 'off',
      // Core
      'no-undef': 'error',
    },
  },
]
