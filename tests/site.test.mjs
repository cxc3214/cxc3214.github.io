import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  "src/pages/editorial.astro",
  "src/pages/404.astro",
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

test("blog posts expose complete metadata and body content", () => {
  const posts = readdirSync(join(root, "src/content/blog"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => `src/content/blog/${file}`);

  assert.ok(posts.length > 0, "the blog should contain at least one post");

  for (const post of posts) {
    assert.equal(existsSync(join(root, post)), true, `${post} should exist`);
    const content = read(post);
    assert.match(content, /^title: .+$/m, `${post} should have title`);
    assert.match(content, /^description: .+$/m, `${post} should have description`);
    assert.match(content, /^date: \d{4}-\d{2}-\d{2}$/m, `${post} should have date`);
    assert.match(content, /^tags:\s*\[/m, `${post} should have tags`);
    assert.match(content, /^topic: (web|engineering|data)$/m, `${post} should have a reading topic`);
    assert.match(content, /^kind: (仓库实践|排查记录|技术指南|设计笔记)$/m, `${post} should identify its evidence type`);
    assert.match(content, /^scope: .+$/m, `${post} should explain its scope`);
    const body = content.replace(/^---[\s\S]*?---/, "");
    assert.ok(body.trim().length > 0, `${post} should have body content`);
  }
});

test("AdSense article records verifiable implementation details", () => {
  const content = read("src/content/blog/google-adsense-review-checklist.md");

  assert.match(content, /^updated: 2026-09-19$/m);
  assert.match(content, /support\.google\.com\/adsense\/answer\/7402256/);
  assert.match(content, /```html[\s\S]*google-adsense-account/);
  assert.match(content, /```txt[\s\S]*pub-3132117537257566/);
  assert.ok((content.match(/^## /gm) ?? []).length >= 6);
  assert.match(content, /已授权/);
  assert.match(content, /低价值内容/);
});

test("site configuration references the root domain, AdSense, and project links", () => {
  assert.match(read("astro.config.mjs"), /site:\s*["']https:\/\/imspring\.cn["']/);
  assert.match(read("src/config/site.ts"), /ca-pub-3132117537257566/);
  assert.match(read("src/config/site.ts"), /worldCup:\s*"https:\/\/worldcup\.imspring\.cn"/);
  assert.match(read("src/config/site.ts"), /testData:\s*"https:\/\/testdata\.imspring\.cn"/);
});

test("AdSense verification script is enabled in the shared head", () => {
  assert.match(read("src/config/site.ts"), /adsense:\s*\{[\s\S]*?enabled:\s*true/);
  assert.match(read("src/layouts/BaseLayout.astro"), /name="google-adsense-account"/);
  assert.match(read("src/layouts/BaseLayout.astro"), /content=\{siteConfig\.adsense\.publisherId\}/);
  assert.match(read("src/layouts/BaseLayout.astro"), /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  assert.match(read("src/layouts/BaseLayout.astro"), /client=\$\{siteConfig\.adsense\.publisherId\}/);
});

test("privacy policy describes the active AdSense integration", () => {
  const privacy = read("src/pages/privacy.astro");

  assert.match(privacy, /本站已启用 Google AdSense/);
  assert.match(privacy, /本网站使用 Google AdSense/);
  assert.doesNotMatch(privacy, /已预留 Google AdSense|AdSense 或其他第三方服务启用后/);
  assert.match(privacy, /policies\.google\.com\/technologies\/partner-sites/);
  assert.match(privacy, /myadcenter\.google\.com/);
  assert.match(privacy, /生效及最近更新日期/);
});

test("Cloudflare Web Analytics is enabled in the shared head", () => {
  assert.match(read("src/config/site.ts"), /0e3d1c5c0b0e4837875eca4b687b9cb8/);
  assert.match(read("src/layouts/BaseLayout.astro"), /static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(read("src/layouts/BaseLayout.astro"), /data-cf-beacon/);
  assert.match(read("src/pages/privacy.astro"), /Cloudflare Web Analytics/);
});

test("visual refresh keeps the blog distinctive and readable", () => {
  const css = read("src/styles/global.css");
  assert.match(css, /--ink:/, "design tokens should include the editorial ink color");
  assert.match(css, /--signal:/, "design tokens should include a restrained signal accent");
  assert.match(css, /\.hero::before/, "homepage hero should have a technical texture layer");
  assert.match(css, /\.post-card::before/, "post cards should expose numbered editorial markers");
  assert.match(css, /\.article-header::after/, "article pages should include a reading progress rail");
  assert.match(css, /prefers-reduced-motion/, "motion should respect reduced-motion preferences");

  assert.match(read("src/pages/index.astro"), /class="hero-kicker"/);
  assert.match(read("src/pages/blog/index.astro"), /data-index=\{String\(index \+ 1\)\.padStart\(2, "0"\)\}/);
  assert.match(read("src/layouts/PostLayout.astro"), /class="article-kicker"/);
});

test("visible source copy stays clean and Chinese-first", () => {
  const files = [
    "src/pages/index.astro",
    "src/pages/blog/index.astro",
    "src/pages/about.astro",
    "src/pages/contact.astro",
    "src/pages/projects.astro",
    "src/config/site.ts",
    "src/layouts/BaseLayout.astro",
    "src/layouts/PostLayout.astro",
  ];

  for (const file of files) {
    const content = read(file);
    assert.doesNotMatch(content, /鐨|杩|鍗|椤|绔||€/, `${file} should not contain mojibake copy`);
    assert.doesNotMatch(
      content,
      /Home|Writing|Projects|Contact|Read the blog|View projects|Recent writing|Latest dispatches|Back to writing|More essays|View World Cup Live|Spring builds small useful things|Writing archive/,
      `${file} should not keep old English UI copy`,
    );
  }
});

test("visible project and contact copy includes the TestData site", () => {
  assert.match(read("src/pages/projects.astro"), /TestData/);
  assert.match(read("src/pages/projects.astro"), /testdata\.imspring\.cn/);
  assert.match(read("src/pages/contact.astro"), /testdata\.imspring\.cn/);
});

test("app downloads use versioned HTTPS artifacts and publish compliance context", () => {
  const apps = JSON.parse(read("src/config/apps.json"));
  assert.equal(apps.length, 2);

  for (const app of apps) {
    assert.match(app.downloadUrl, /^https:\/\/mdm\.imspring\.cn\/files\//);
    assert.doesNotMatch(app.downloadUrl, /latest|app-debug|app-release/);
    assert.match(app.packageId, /^com\.imspring\./);
    assert.match(app.sha256, /^[a-f0-9]{64}$/);
    assert.ok(app.versionCode > 0);
    assert.match(app.ogImage, /^\/apps\/[a-z]+-og\.png$/);
  }

  assert.match(read("src/pages/apps/index.astro"), /内部测试版本/);
  assert.match(read("src/pages/apps/tingban/index.astro"), /不是医疗器械/);
  assert.match(read("src/pages/apps/routedeck/index.astro"), /合法授权/);
  assert.match(read("src/pages/privacy.astro"), /二维码由本站预先生成/);
});

test("shared metadata exposes theme, active navigation, and centralized owner contact", () => {
  const layout = read("src/layouts/BaseLayout.astro");
  const site = read("src/config/site.ts");

  assert.match(layout, /meta name="theme-color"/);
  assert.match(layout, /aria-current=/);
  assert.match(layout, /ogImagePath = siteConfig\.ogImage/);
  assert.match(site, /email: "cxc3214@qq\.com"/);
  assert.match(site, /themeColor: "#f4f1e9"/);
});

test("each app has a local QR asset and an application privacy page", () => {
  for (const id of ["tingban", "routedeck"]) {
    assert.ok(existsSync(join(root, `public/apps/${id}-download-qr.svg`)));
    assert.ok(existsSync(join(root, `public/apps/${id}-og.png`)));
    assert.ok(existsSync(join(root, `src/pages/apps/${id}/privacy.astro`)));
  }
});

test("brand mark is CSS-only and does not duplicate the Spring wordmark", () => {
  assert.doesNotMatch(read("src/layouts/BaseLayout.astro"), /brand-mark/);
  assert.match(read("src/styles/global.css"), /\.brand::before/);
});

test("post layout uses the Astro content render helper", () => {
  const layout = read("src/layouts/PostLayout.astro");
  assert.match(layout, /import\s+\{[^}]*\brender\b[^}]*\}\s+from\s+["']astro:content["']/);
  assert.match(layout, /await\s+render\(post\)/);
  assert.doesNotMatch(layout, /post\.render\(/);
  assert.match(layout, /post\.data\.updated/);
  assert.match(layout, /更新于/);
});
