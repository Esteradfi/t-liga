import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    });
  },
};
export default config;
