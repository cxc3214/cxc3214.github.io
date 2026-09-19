---
title: 一个 Astro 博客怎样发布：从 Markdown 到线上页面的检查链
description: 以 imspring.cn 的真实目录和构建配置为例，检查内容路由、canonical、构建产物与 GitHub Pages 发布之间的关系。
date: 2026-09-19
tags: ["Astro", "GitHub Pages", "发布验证"]
topic: web
kind: 仓库实践
scope: 基于本网站仓库的静态构建配置；命令面向 Node.js 22.12 及以上。线上检查结果只代表执行时刻，不能替代后续发布验证。
---

这个博客最容易被误判的一步，是看到 GitHub Actions 的构建成功，就以为读者已经看到新文章。实际至少有三个独立结果：Markdown 被收录、HTML 被生成、生成的文件被发布到域名。本文沿着本站的文件结构逐一检查，适合排查“文章本地存在，线上却找不到”的问题。

## 先确认你正在发布哪一个站点

imspring.cn 主站使用 Astro，文章在 `src/content/blog/`，构建输出到 `dist/`，由 GitHub Pages 托管。工具子站的构建方式并不适用于主站。2026 年 9 月 19 日检查时，主站的几个关键文件如下：

```text
src/content/blog/             Markdown 正文和元数据
src/content.config.ts        集合定义和字段校验
src/pages/blog/[...slug].astro 生成文章路由
src/layouts/PostLayout.astro  文章正文、目录和结构化数据
src/layouts/BaseLayout.astro  canonical、导航和共享脚本
astro.config.mjs             生产域名与 sitemap
public/CNAME                 GitHub Pages 自定义域名
.github/workflows/deploy.yml 构建与发布流程
```

这种分工让排查有了方向：文章标题错，先查 Markdown；所有文章的 canonical 错，先查共享布局；本地正常但线上旧，先查部署版本和缓存，而不是反复改正文。

## 内容集合决定文件有没有成为文章

本站使用 glob 加载 Markdown。路由文件调用 `getCollection("blog")`，为集合里的每篇文章生成路径。文件名例如 `astro-github-pages-release-checks.md`，对应本文的 URL。

```ts
export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}
```

如果构建日志里没有出现预期路由，先看文件是不是位于正确目录、扩展名是不是 `.md`、frontmatter 是否通过校验。修改目录但不修改加载路径，会得到“文件在仓库里、集合却看不到”的情况。反过来，如果构建产物已有文章而归档页不显示，应检查归档筛选和排序。

## 用锁文件和一致的运行环境构建

本站 `package.json` 规定 Node.js 至少为 22.12，工作流使用 Node 22。安装依赖用锁文件，减少本地与持续集成环境的差异：

```sh
node --version
npm ci
npm test
npm run build
npm run test:built
```

如果第一步版本太旧，先切换环境。不要为了绕过运行时检查随意删除锁文件。构建完成后，`test:built` 会检查生成页面的站内链接、目录锚点、canonical 和 sitemap；它不能判断文字是否准确或界面是否好读。再查看 `dist/blog/`，确认目标目录里有 HTML，并用 `npm run preview -- --host 127.0.0.1` 打开生产构建。

预览服务器与开发服务器的用途不同。开发服务器便于迭代，预览服务器能暴露“构建后路径不对”“资源没进入产物”等问题。两者都不能证明公网域名已更新。

## canonical 和链接要指向同一个内容身份

本站从生产域名和当前路径生成 canonical。例如本文应指向 `https://imspring.cn/blog/astro-github-pages-release-checks/`，不能因为在本地构建就变成 localhost，也不能所有文章都指向首页。

值得检查的不是“有没有 canonical”这一项，而是它与文章 URL、Open Graph URL、结构化数据中的主页面地址是否一致。旧文章被实质改写后仍保留原 URL，同时显示更新日期；只有页面迁移时才讨论重定向。

目录链接也属于构建结果。文章的二级标题经过 Markdown 渲染后拥有锚点，目录使用渲染器返回的 `headings`，而不是自己再猜一次中文标题如何转成 ID。这样修改标题后，目录与正文会一起变化。

## 发布成功还要检查读者实际访问的页面

本站工作流把 `dist` 上传为 Pages artifact，再部署该 artifact。推送前应先确认当前分支和变更范围，不能把临时文件或其他项目内容一起带入发布。

发布完成后，可以用以下只读命令检查内容入口：

```sh
curl -I https://imspring.cn/
curl -I https://imspring.cn/blog/astro-github-pages-release-checks/
curl -fsS https://imspring.cn/sitemap-index.xml
```

HTTP 200 只是第一层证据。还要打开页面核对新标题、正文、导航和修订日期。如果页面没变，查看响应里的缓存信息与 `Last-Modified`，再对照部署的提交。不要把清缓存当成修复所有问题的方法：如果发布了错误分支，缓存过期后仍然是错误内容。

## 常见现象对应哪一层

| 现象 | 优先检查 | 不足以证明什么 |
| --- | --- | --- |
| 构建找不到文章 | 内容目录、frontmatter、集合配置 | 仓库里有文件不等于已生成路由 |
| 文章能打开但归档没有 | 归档筛选、排序和链接 | 单页存在不等于读者找得到 |
| 首页新、文章旧 | 发布产物、路径、缓存 | 首页更新不等于所有页面更新 |
| 所有 canonical 都是首页 | 共享布局参数 | 有 SEO 标签不等于标签正确 |
| 本地图片正常、线上 404 | 资源路径与 dist 内容 | 开发服务器成功不等于静态发布成功 |

本站的做法是先检查产物，再看预览，最后检查公网。每一层都回答一个具体问题，能够少走一些“配置全改一遍”的弯路。

## 源码与继续阅读

- [本站源码仓库](https://github.com/cxc3214/cxc3214.github.io)：上面的文件路径均来自该仓库。
- [Astro 的 GitHub Pages 部署说明](https://docs.astro.build/en/guides/deploy/github/)：平台配置发生变化时以这里为准。
- [AI 辅助修改如何验收](/blog/ai-assisted-development-practice/)：怎样把检查写成明确的交付条件。
