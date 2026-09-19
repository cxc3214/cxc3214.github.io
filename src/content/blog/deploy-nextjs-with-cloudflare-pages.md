---
title: Next.js 静态导出部署前：先确认 out 目录能独立运行
description: 用一组最小配置和故障检查区分 Next.js 静态导出与服务端应用，避免把本地开发成功误当成 Pages 部署成功。
date: 2026-06-13
updated: 2026-09-19
tags: ["Next.js", "静态导出", "部署"]
topic: web
kind: 技术指南
scope: 针对可以静态生成的 Next.js 项目；本文配置是教学示例，imspring.cn 主站实际使用 Astro 和 GitHub Pages，并非本文方案的部署实例。
---

旧版文章把“部署 Next.js”描述得过于宽泛。真正需要先回答的是：部署后有没有一个服务端进程替你处理请求？如果目标只是发布静态文件，页面必须在构建阶段确定下来。本文收窄到静态导出，不把它与 SSR 或其他服务端部署混为一谈。

## 用一次离线检查判断是否选错部署形态

一个快速判断方法是：停止开发服务器，只保留导出的目录，再用普通静态服务器打开它。假如页面必须依赖 Next.js 在请求时读取 Cookie、处理 Server Action 或执行动态接口，这个目录不能独立提供完整功能。

这不是框架出错，而是需求与托管形态不匹配。公开文章、文档和不依赖请求时数据的介绍页通常容易静态化；用户后台、实时账户数据和写入操作需要明确的服务端方案。浏览器调用外部 API 是另一条网络链路，也要单独处理鉴权、跨域和失败状态。

## 最小配置只解决导出，不解决所有功能

以下示例使用 ES Module 配置文件：

```js
// next.config.mjs
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
```

`output` 选择静态导出；尾斜杠使示例按目录形式访问；关闭默认图片优化意味着图片需要自己处理尺寸与压缩。这些选项不是性能优化清单，也不能让动态功能自动变成静态。

```sh
npm ci
npm run build
```

在未自定义导出目录的情况下，检查 `out/` 而不是把整个 `.next/` 当静态站点上传。选择 Cloudflare Pages 静态托管时，构建输出目录也应与实际产物一致。平台的框架选项会变化，操作时核对 [Cloudflare 静态 Next.js 指南](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)。

## 动态路径必须提前知道有哪些页面

例如一个 `/notes/[slug]` 文章路由，如果构建阶段只有两个 slug，就只能导出对应页面。下面是演示路径清单，不是本站运行代码：

```js
export function generateStaticParams() {
  return [
    { slug: 'first-note' },
    { slug: 'release-check' },
  ];
}
```

增加一篇文章后，数据源、路径清单和正文渲染都要覆盖它。只新增导航链接而没有生成对应页面，点击时仍然会 404。反过来，生成了文件却不加入导航，读者也不容易找到。

## 用故障现象选择检查顺序

| 现象 | 第一个检查点 | 后续动作 |
| --- | --- | --- |
| 平台构建成功但首页空白 | 输出目录是否选错 | 看上传文件里是否有 index.html |
| 首页可用，文章刷新 404 | 深层路径是否生成 | 对照导出的目录与链接格式 |
| 图片失败 | 是否仍请求服务端优化接口 | 使用支持静态输出的图片方案 |
| 新文章没有出现 | 构建时数据和路径列表 | 检查是否需要重新构建 |
| 用户操作无法提交 | 是否依赖服务端功能 | 明确独立 API 或服务端托管方案 |

这张表的作用是减少无关修改。比如目标文件根本没有生成，先改 DNS 没有意义；如果只是静态图片 URL 错误，也不需要更换整个托管平台。

## 公共变量与静态产物都可能暴露信息

带 `NEXT_PUBLIC_` 的变量会用于公开前端环境。另一个容易忽略的情况是：构建期间读取的数据被写进 HTML 或 JavaScript，即使变量名没有这个前缀，写入产物的数据仍是公开的。

因此示例项目只放虚构数据，生产项目应检查实际 `out/` 内容。不要把“变量配置在平台控制台”当成不会泄露的保证。需要请求时鉴权的数据，不适合直接导出为任何访客都能下载的静态文件。

## 发布验收与适用边界

正式发布前，至少打开首页、一个深层文章地址和一个不存在的地址；核对图片、链接和 canonical。发布后对公开域名再做相同检查，避免只验证预览域名。

本指南不是 Next.js 全栈部署教程。Cloudflare 的当前文档将静态 Pages 与 Workers 上的全栈方案分开，具有 SSR 等需求时应从[平台部署入口](https://developers.cloudflare.com/pages/framework-guides/nextjs/)重新选择。Next.js 支持范围以[静态导出文档](https://nextjs.org/docs/app/guides/static-exports)为准。

2026 年 9 月 19 日修订：明确本文为示例指南，补充导出检查和故障路径；本站自己的实际方案见 [Astro 发布笔记](/blog/astro-github-pages-release-checks/)。
