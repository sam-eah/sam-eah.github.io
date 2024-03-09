import { defineConfig } from 'astro/config';
import prefetch from '@astrojs/prefetch';
import svelte from '@astrojs/svelte';
import path from 'path';
import { fileURLToPath } from 'url';

import tailwind from '@astrojs/tailwind';
// import mdx from '@astrojs/mdx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://sam-eah.github.io',
  integrations: [
    // mdx(),
    prefetch(),
    svelte(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});
