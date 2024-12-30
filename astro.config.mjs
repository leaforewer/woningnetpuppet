// @ts-check
import {defineConfig} from 'astro/config';

import tailwind from '@astrojs/tailwind';

import vue from '@astrojs/vue';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), vue()],

  server: {
    port: 3000,
  },

  adapter: vercel(),
});