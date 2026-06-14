# Personal Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Astro personal homepage, blog, project showcase, and GitHub Pages deployment setup for `imspring.cn`.

**Architecture:** Astro renders static pages from Markdown content collections. Shared layout and SEO components provide metadata, canonical URLs, social cards, JSON-LD, and optional AdSense script injection.

**Tech Stack:** Astro, Markdown content collections, CSS, Node test runner, GitHub Actions Pages.

---

### Task 1: Baseline Validation

**Files:**
- Create: `tests/site.test.mjs`
- Modify: `package.json`

- [x] Add a Node test that checks required pages, five Markdown posts, metadata, minimum Chinese content length, AdSense files, CNAME, and GitHub Pages workflow.
- [x] Run `npm test` and verify it fails before the site files exist.

### Task 2: Astro Site Structure

**Files:**
- Modify: `astro.config.mjs`
- Create: `src/config/site.ts`
- Create: `src/content.config.ts`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/PostLayout.astro`
- Create: `src/styles/global.css`
- Modify: `src/pages/index.astro`

- [ ] Configure site URL and sitemap integration.
- [ ] Add shared SEO, navigation, footer, and optional AdSense script.
- [ ] Build a credible homepage with personal intro, project entry, and latest posts.

### Task 3: Content and Pages

**Files:**
- Create: `src/content/blog/*.md`
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[...slug].astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/contact.astro`
- Create: `src/pages/privacy.astro`
- Create: `src/pages/terms.astro`
- Create: `src/pages/projects.astro`

- [ ] Add five original Chinese posts with title, description, date, tags, and at least 800 Chinese characters each.
- [ ] Add required static pages with page-specific titles and descriptions.
- [ ] Add BlogPosting JSON-LD to article pages.

### Task 4: Deployment and Docs

**Files:**
- Create: `public/CNAME`
- Create: `public/ads.txt`
- Create: `public/robots.txt`
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] Add GitHub Actions Pages deployment.
- [ ] Add DNS, local startup, article authoring, and deployment instructions.
- [ ] Run `npm test` and `npm run build`.
