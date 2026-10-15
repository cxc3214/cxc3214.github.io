import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("src/config/study.json", root), "utf8"));
const output = new URL(".study-dist/", root);
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const seen = new Set();
for (const item of catalog) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || seen.has(item.id)) {
    throw new Error(`Invalid or duplicate study ID: ${item.id}`);
  }
  seen.add(item.id);
  if (item.source.includes("/") || item.source.includes("\\") || !item.source.endsWith(".html")) {
    throw new Error(`Invalid study source: ${item.id}`);
  }
  await readFile(new URL(`study/pages/${item.source}`, root));
}

const shell = (title, content, reader = false) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="light">
<title>${escape(title)} | Spring 学习资料</title><link rel="stylesheet" href="/study/study.css"></head>
<body${reader ? ' class="reader"' : ""}>${content}</body></html>`;

await rm(output, { recursive: true, force: true });
await mkdir(new URL("study/pages/", output), { recursive: true });
await cp(new URL("study/study.css", root), new URL("study/study.css", output));
await cp(new URL("study/reader.js", root), new URL("study/reader.js", output));
await cp(new URL("study/embedded.css", root), new URL("study/embedded.css", output));

const rows = catalog.map((item, index) => `<a class="resource" href="/study/${item.id}/">
<span class="number">${String(index + 1).padStart(2, "0")}</span>
<span class="resource-copy"><span class="category">${escape(item.category)}</span><h2>${escape(item.title)}</h2>
<span class="subtitle">${escape(item.subtitle)}</span><p>${escape(item.description)}</p></span>
<span class="open" aria-hidden="true">&#8594;</span></a>`).join("\n");

await writeFile(new URL("study/index.html", output), shell("论文与重点知识", `
<a class="skip" href="#resources">跳到资料目录</a>
<header class="site-bar"><a class="brand" href="/">Spring</a><nav aria-label="栏目导航"><a href="/blog/">博客</a><a href="/study/" aria-current="page">学习资料</a></nav></header>
<main><section class="heading"><p class="eyebrow">系统架构设计师 / 学习资料</p><h1>论文与重点知识</h1>
<p class="intro">论文方法、考前精要与交互实验。</p><div class="summary"><span>${catalog.length} 份资料</span><span>论文 / 知识 / 实验</span></div></section>
<section id="resources" class="resources" aria-label="资料目录">${rows}</section></main>
<footer><span>Spring · 学习资料</span><a href="/">返回主站 &#8599;</a></footer>`));

for (const [index, item] of catalog.entries()) {
  await cp(new URL(`study/pages/${item.source}`, root), new URL(`study/pages/${item.id}.html`, output));
  await mkdir(new URL(`study/${item.id}/`, output), { recursive: true });
  const options = catalog.map((entry) => `<option value="/study/${entry.id}/"${entry.id === item.id ? " selected" : ""}>${escape(entry.title)}</option>`).join("");
  const previous = catalog[index - 1];
  const next = catalog[index + 1];
  await writeFile(new URL(`study/${item.id}/index.html`, output), shell(item.title, `
<header class="reader-bar"><a class="directory" href="/study/">&#8592; 资料目录</a>
<label class="switcher"><span class="sr-only">切换学习资料</span><select id="resource-select">${options}</select></label>
<nav class="pager" aria-label="资料翻页">${previous ? `<a href="/study/${previous.id}/" title="${escape(previous.title)}">&#8592; 上一份</a>` : '<span aria-disabled="true">&#8592; 上一份</span>'}
<span class="position">${index + 1} / ${catalog.length}</span>${next ? `<a href="/study/${next.id}/" title="${escape(next.title)}">下一份 &#8594;</a>` : '<span aria-disabled="true">下一份 &#8594;</span>'}</nav>
<a class="original" href="/study/pages/${item.id}.html" target="_blank" rel="noopener">原页 &#8599;</a></header>
<iframe id="document-frame" title="${escape(item.title)}" src="/study/pages/${item.id}.html" allow="fullscreen"></iframe>
<script src="/study/reader.js" defer></script>`, true));
}

console.log(`Built ${catalog.length} study documents in ${fileURLToPath(output)} (separate from GitHub Pages dist).`);
