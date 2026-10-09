import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'build/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      // react-hooks v7 "recommended" enables React Compiler rules
      // (immutability, refs, purity...) that forbid mutating objects in
      // useFrame/effects — the core react-three-fiber idiom. Keep only the
      // two classic hook rules.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/no-unknown-property': 'off', // False positives on react-three-fiber props (args, object, side...)
      'react/prop-types': 'off', // Plain JS project, no prop-types
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
