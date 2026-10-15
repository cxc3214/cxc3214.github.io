import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { test } from "node:test";
import worker from "../workers/study.mjs";

const credentials = { STUDY_BASIC_USER: "test-reader", STUDY_BASIC_PASSWORD: "test-only:密码" };
const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
const validHeader = basic(credentials.STUDY_BASIC_USER, credentials.STUDY_BASIC_PASSWORD);
const paths = ["/study/", "/study/redis/", "/study/pages/redis.html", "/study/study.css", "/study/reader.js", "/study/embedded.css", "/study/missing"];

function environment(extra = {}) {
  const requests = [];
  return {
    requests,
    env: {
      ...credentials,
      ASSETS: { async fetch(request) { requests.push(request); return new Response("protected document", { headers: { "Content-Type": "text/html" } }); } },
      ...extra,
    },
  };
}

test("every study route denies unauthenticated, incorrect, and malformed credentials before loading assets", async () => {
  for (const path of paths) {
    for (const header of [undefined, "Bearer anything", "Basic !!!", "Basic /w==", "Basic dGVzdA==", basic("wrong", credentials.STUDY_BASIC_PASSWORD), basic(credentials.STUDY_BASIC_USER, "wrong")]) {
      const { env, requests } = environment();
      const response = await worker.fetch(new Request(`https://imspring.cn${path}`, { headers: header ? { Authorization: header } : {} }), env);
      assert.equal(response.status, 401, `${path}: ${header}`);
      assert.match(response.headers.get("WWW-Authenticate"), /^Basic realm=/);
      assert.match(response.headers.get("Cache-Control"), /no-store/);
      assert.equal(requests.length, 0);
      assert.doesNotMatch(await response.text(), /protected document/);
    }
  }
});

test("missing or invalid secrets fail closed", async () => {
  for (const extra of [{ STUDY_BASIC_USER: "" }, { STUDY_BASIC_PASSWORD: undefined }, { STUDY_BASIC_USER: "bad:user" }]) {
    const { env, requests } = environment(extra);
    const response = await worker.fetch(new Request("https://imspring.cn/study/", { headers: { Authorization: validHeader } }), env);
    assert.equal(response.status, 503);
    assert.equal(requests.length, 0);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  }
});

test("valid UTF-8 credentials allow assets, strip authorization, and prevent shared caching", async () => {
  for (const path of paths) {
    const { env, requests } = environment();
    const response = await worker.fetch(new Request(`https://imspring.cn${path}`, { headers: { Authorization: validHeader } }), env);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "protected document");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers.has("Authorization"), false);
    assert.equal(response.headers.get("Vary"), "Authorization");
    assert.equal(response.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
    assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
  }
});

test("asset status, redirect, and content type are preserved after authentication", async () => {
  for (const status of [200, 206, 301, 304, 404]) {
    const { env } = environment({ ASSETS: { fetch: async () => new Response(status === 304 ? null : "asset", { status, headers: { Location: "/study/", "Content-Type": "text/css" } }) } });
    const response = await worker.fetch(new Request("https://imspring.cn/study/study.css", { headers: { Authorization: validHeader } }), env);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Content-Type"), "text/css");
    assert.equal(response.headers.get("Location"), "/study/");
  }
});

test("authenticated access cannot warm a public copy or open other worker paths", async () => {
  const { env, requests } = environment();
  await worker.fetch(new Request("https://imspring.cn/study/", { headers: { Authorization: validHeader } }), env);
  const anonymous = await worker.fetch(new Request("https://imspring.cn/study/"), env);
  assert.equal(anonymous.status, 401);
  for (const path of ["/", "/study-other/", "/pages/redis.html"]) {
    assert.equal((await worker.fetch(new Request(`https://imspring.cn${path}`, { headers: { Authorization: validHeader } }), env)).status, 404);
  }
  assert.equal(requests.length, 1);
});

test("HTTP is upgraded, read methods work, and writes are rejected", async () => {
  const { env, requests } = environment();
  const redirect = await worker.fetch(new Request("http://imspring.cn/study/?q=1"), env);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("Location"), "https://imspring.cn/study/?q=1");
  const denied = await worker.fetch(new Request("https://imspring.cn/study/", { method: "POST", headers: { Authorization: validHeader } }), env);
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get("Allow"), "GET, HEAD");
  assert.equal(requests.length, 0);
  const canonical = await worker.fetch(new Request("https://imspring.cn/study?q=1"), env);
  assert.equal(canonical.status, 308);
  assert.equal(canonical.headers.get("Location"), "https://imspring.cn/study/?q=1");
  assert.equal(canonical.headers.has("WWW-Authenticate"), false);
  for (const method of ["GET", "HEAD"]) {
    assert.equal((await worker.fetch(new Request("https://imspring.cn/study/", { method, headers: { Authorization: validHeader } }), env)).status, 200);
  }
});

test("study build preserves all originals and isolates documents from public assets", () => {
  execFileSync(process.execPath, ["scripts/build-study.mjs"]);
  const catalog = JSON.parse(readFileSync("src/config/study.json", "utf8"));
  const index = readFileSync(".study-dist/study/index.html", "utf8");
  assert.equal(catalog.length, readdirSync("study/pages").filter((name) => name.endsWith(".html")).length);
  assert.equal((index.match(/class="resource"/g) ?? []).length, catalog.length);
  for (const [position, item] of catalog.entries()) {
    assert.deepEqual(readFileSync(`.study-dist/study/pages/${item.id}.html`), readFileSync(`study/pages/${item.source}`));
    assert.ok(index.includes(`href="/study/${item.id}/"`));
    const reader = readFileSync(`.study-dist/study/${item.id}/index.html`, "utf8");
    assert.ok(reader.includes(`src="/study/pages/${item.id}.html"`));
    assert.equal((reader.match(/<option /g) ?? []).length, catalog.length);
    assert.ok(reader.includes(`${position + 1} / ${catalog.length}`));
  }
  assert.equal(existsSync("public/study"), false);
  assert.equal(existsSync("src/pages/study"), false);
  const config = JSON.parse(readFileSync("wrangler.study.jsonc", "utf8"));
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.assets.directory, ".study-dist");
});
