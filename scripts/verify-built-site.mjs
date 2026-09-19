import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

// Check the actual static output, including cross-page fragments. Run after build.
const root = resolve("dist");
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
const files = walk(root).filter((file) => file.endsWith(".html"));
const pages = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const origin = "https://imspring.cn";
const decode = (text) => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attr = (tag, name) => decode(tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? "");
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((match) => match[0]);
const urlFor = (file) => new URL(`/${relative(root, file).replace(/index\.html$/, "")}`, origin);
const targetFor = (pathname) => {
  const path = resolve(root, `.${decodeURIComponent(pathname)}`);
  assert.ok(path === root || path.startsWith(root + "/"), "link escaped dist");
  return existsSync(path) && statSync(path).isDirectory() ? resolve(path, "index.html") : path;
};
const sitemap = readFileSync(resolve(root, "sitemap-0.xml"), "utf8");
let links = 0;
let fragments = 0;
let articles = 0;
for (const [file, html] of pages) {
  const url = urlFor(file);
  const errorPage = url.pathname === "/404.html";
  assert.equal(tags(html, "h1").length, 1, `${url.pathname}: one main heading`);
  const canonical = tags(html, "link").filter((tag) => attr(tag, "rel") === "canonical");
  assert.equal(canonical.length, 1);
  assert.equal(attr(canonical[0], "href"), url.href, `${url.pathname}: canonical`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => decode(match[1]));
  assert.equal(new Set(ids).size, ids.length, `${url.pathname}: duplicate IDs`);
  assert.equal(tags(html, "meta").filter((tag) => attr(tag, "name") === "google-adsense-account").length, 1);
  assert.equal(tags(html, "script").filter((tag) => attr(tag, "src").includes("pagead2.googlesyndication.com")).length, errorPage ? 0 : 1);
  assert.equal(/name="robots" content="noindex,follow"/.test(html), errorPage, `${url.pathname}: indexing`);
  assert.equal(sitemap.includes(`<loc>${url.href}</loc>`), !errorPage, `${url.pathname}: sitemap`);
  for (const tag of [...tags(html, "a"), ...tags(html, "img"), ...tags(html, "script"), ...tags(html, "link")]) {
    const value = attr(tag, "href") || attr(tag, "src");
    if (!value || /^(mailto:|data:|tel:)/.test(value)) continue;
    const target = new URL(value, url);
    if (target.origin !== origin) continue;
    const targetFile = targetFor(target.pathname);
    assert.ok(existsSync(targetFile), `${url.pathname}: missing ${value}`);
    links++;
    if (target.hash) {
      const targetHtml = pages.get(targetFile);
      if (targetHtml) {
        assert.ok(targetHtml.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `${url.pathname}: broken fragment ${value}`);
        fragments++;
      }
    }
  }
  if (/^\/blog\/.+\/$/.test(url.pathname)) {
    articles++;
    assert.ok(html.includes('aria-label="本文目录"'), `${url.pathname}: missing TOC`);
    assert.ok(html.includes('aria-label="阅读范围"'), `${url.pathname}: missing scope`);
    for (const tag of tags(html, "pre")) {
      assert.equal(attr(tag, "tabindex"), "0", `${url.pathname}: code keyboard access`);
      assert.equal(attr(tag, "role"), "region");
      assert.ok(attr(tag, "aria-label"));
    }
    const tableRegions = tags(html, "div").filter((tag) => attr(tag, "class").split(/\s+/).includes("table-scroll"));
    assert.equal(tableRegions.length, tags(html, "table").length, `${url.pathname}: table wrappers`);
    for (const tag of tableRegions) {
      assert.equal(attr(tag, "tabindex"), "0", `${url.pathname}: table keyboard access`);
      assert.equal(attr(tag, "role"), "region");
      assert.ok(attr(tag, "aria-label"));
    }
    for (const tag of tags(html, "th")) assert.equal(attr(tag, "scope"), "col");
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
    const metadata = JSON.parse(json);
    assert.equal(metadata["@type"], "BlogPosting");
    assert.equal(metadata.mainEntityOfPage, url.href);
    assert.ok(new Date(metadata.dateModified) >= new Date(metadata.datePublished));
    assert.equal(metadata.author.url, `${origin}/about/`);
  }
}
for (const slug of ["why-i-started-a-personal-website", "ai-assisted-development-practice", "deploy-nextjs-with-cloudflare-pages", "world-cup-live-project-notes", "google-adsense-review-checklist"]) {
  assert.ok(existsSync(resolve(root, "blog", slug, "index.html")), `lost old URL: ${slug}`);
}
assert.equal(readFileSync(resolve(root, "ads.txt"), "utf8").trim(), "google.com, pub-3132117537257566, DIRECT, f08c47fec0942fa0");
console.log(JSON.stringify({ pages: pages.size, articles, internalLinks: links, fragments, result: "PASS" }));
