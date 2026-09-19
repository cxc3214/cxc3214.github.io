// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import readableBlocks from './src/lib/readable-blocks.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://imspring.cn',
  markdown: { processor: satteri({ hastPlugins: [readableBlocks()] }) },
  integrations: [sitemap({ filter: (page) => !/\/404(?:\.html|\/)?$/.test(page) })],
});
