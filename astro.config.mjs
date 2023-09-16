import { defineConfig } from 'astro/config';
import prefetch from "@astrojs/prefetch";
import svelte from "@astrojs/svelte";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://sam-eah.github.io',
  integrations: [prefetch(), svelte(), tailwind()]
});