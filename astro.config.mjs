// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://imspring.cn',
  integrations: [sitemap({ filter: (page) => !/\/404(?:\.html|\/)?$/.test(page) })],
});
