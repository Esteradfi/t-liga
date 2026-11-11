import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path from 'node:path';

const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const fsd = {
  rules: {
    'layer-imports': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          upward: 'FSD: {{source}} cannot import from higher layer {{target}}.',
          slice: 'FSD: slices in the same layer cannot import one another.',
        },
      },
      create(context) {
        const filename = context.filename.replaceAll('\\', '/');
        const source = filename.match(/\/src\/([^/]+)\//)?.[1];
        return {
          ImportDeclaration(node) {
            const value = node.source.value;
            if (typeof value !== 'string' || !layers.includes(source)) return;
            const targetPath = value.startsWith('@/')
              ? value.slice(2)
              : value.startsWith('.')
                ? path
                    .relative(
                      filename.slice(0, filename.indexOf('/src/') + 5),
                      path.resolve(path.dirname(filename), value),
                    )
                    .replaceAll('\\', '/')
                : '';
            const target = targetPath.split('/')[0];
            const sourceSlice = filename.match(/\/src\/[^/]+\/([^/]+)\//)?.[1];
            const targetSlice = targetPath.split('/')[1];
            if (
              ['entities', 'features', 'widgets', 'pages'].includes(source) &&
              source === target &&
              sourceSlice !== targetSlice
            )
              context.report({ node, messageId: 'slice' });
            if (layers.includes(target) && layers.indexOf(target) > layers.indexOf(source))
              context.report({ node, messageId: 'upward', data: { source, target } });
          },
        };
      },
    },
  },
};
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'storybook-static/**',
      'playwright-report/**',
      'test-results/**',
      'public/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, fsd },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'fsd/layer-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
