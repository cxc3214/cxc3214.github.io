import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const requiredFiles = [
  "src/pages/index.astro",
  "src/pages/about.astro",
  "src/pages/contact.astro",
  "src/pages/privacy.astro",
  "src/pages/terms.astro",
  "src/pages/projects.astro",
  "src/pages/blog/index.astro",
  "src/pages/blog/[...slug].astro",
  "public/CNAME",
  "public/ads.txt",
  "public/robots.txt",
  ".github/workflows/deploy.yml",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("required site files exist", () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("deployment and ads files contain required values", () => {
  assert.equal(read("public/CNAME").trim(), "imspring.cn");
  assert.match(
    read("public/ads.txt"),
    /google\.com,\s*pub-3132117537257566,\s*DIRECT,\s*f08c47fec0942fa0/,
  );
  assert.match(read("public/robots.txt"), /Sitemap:\s*https:\/\/imspring\.cn\/sitemap-index\.xml/);
  assert.match(read(".github/workflows/deploy.yml"), /deploy-pages/);
});

test("blog contains five complete Chinese Markdown posts", () => {
  const posts = [
    "src/content/blog/why-i-started-a-personal-website.md",
    "src/content/blog/deploy-nextjs-with-cloudflare-pages.md",
    "src/content/blog/world-cup-live-project-notes.md",
    "src/content/blog/google-adsense-review-checklist.md",
    "src/content/blog/ai-assisted-development-practice.md",
  ];

  for (const post of posts) {
    assert.equal(existsSync(join(root, post)), true, `${post} should exist`);
    const content = read(post);
    assert.match(content, /^title: .+$/m, `${post} should have title`);
    assert.match(content, /^description: .+$/m, `${post} should have description`);
    assert.match(content, /^date: \d{4}-\d{2}-\d{2}$/m, `${post} should have date`);
    assert.match(content, /^tags:\s*\[/m, `${post} should have tags`);
    const body = content.replace(/^---[\s\S]*?---/, "");
    const chineseChars = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    assert.ok(chineseChars >= 800, `${post} should have at least 800 Chinese characters`);
  }
});

test("site configuration references the root domain and AdSense publisher", () => {
  assert.match(read("astro.config.mjs"), /site:\s*["']https:\/\/imspring\.cn["']/);
  assert.match(read("src/config/site.ts"), /ca-pub-3132117537257566/);
});

test("post layout uses the Astro content render helper", () => {
  const layout = read("src/layouts/PostLayout.astro");
  assert.match(layout, /import\s+\{[^}]*\brender\b[^}]*\}\s+from\s+["']astro:content["']/);
  assert.match(layout, /await\s+render\(post\)/);
  assert.doesNotMatch(layout, /post\.render\(/);
});
