# Spring 的个人网站

这是部署在 `https://imspring.cn` 的个人主页、博客和项目展示站点。站点使用 Astro 构建，内容以 Markdown 管理，并为 GitHub Pages、SEO 和 Google AdSense 审核准备了基础配置。

## 本地启动

先安装依赖：

```sh
npm install
```

启动开发服务器：

```sh
npm run dev
```

默认访问地址是 `http://localhost:4321`。

生产构建检查：

```sh
npm run build
```

本地预览构建结果：

```sh
npm run preview
```

## 新增文章

在 `src/content/blog/` 下新建 Markdown 文件，例如：

```md
---
title: 新文章标题
description: 这篇文章的简短描述，用于 SEO 和文章列表。
date: 2026-06-14
tags: ["AI", "Web"]
---

这里开始写正文。
```

文件名会成为文章地址，例如 `src/content/blog/my-note.md` 对应 `/blog/my-note/`。

## Google AdSense

发布商 ID 已预留为：

```txt
ca-pub-3132117537257566
```

`public/ads.txt` 内容为：

```txt
google.com, pub-3132117537257566, DIRECT, f08c47fec0942fa0
```

全站 AdSense 脚本由 `src/config/site.ts` 控制。审核或正式投放前，将 `adsense.enabled` 从 `false` 改为 `true`。

## 部署到 GitHub Pages

项目已包含 `.github/workflows/deploy.yml`。推送到 `main` 分支后，GitHub Actions 会自动构建并发布 `dist` 目录到 GitHub Pages。

首次配置 GitHub Pages：

1. 打开 GitHub 仓库的 Settings。
2. 进入 Pages。
3. Source 选择 GitHub Actions。
4. 确认仓库默认分支是 `main`，或把工作流里的分支改成你的实际发布分支。

## 自定义域名和 DNS

项目包含 `public/CNAME`，内容是：

```txt
imspring.cn
```

根域名 `imspring.cn` 指向 GitHub Pages 时，通常配置 A 记录到 GitHub Pages 官方 IP：

```txt
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

如果 DNS 服务商支持 ALIAS、ANAME 或 CNAME Flattening，也可以按服务商说明把根域名指向 `<你的 GitHub 用户名>.github.io`。

`www.imspring.cn` 建议配置为 CNAME：

```txt
<你的 GitHub 用户名>.github.io
```

然后在 GitHub Pages 的 Custom domain 中使用 `imspring.cn`，并开启 Enforce HTTPS。GitHub Pages 会把 `www.imspring.cn` 作为备用域名处理；如果你希望强制 `www` 跳转到根域名，建议在 DNS/CDN 层添加重定向规则，目标为：

```txt
https://imspring.cn/$1
```

## 已生成页面

- `/`
- `/blog/`
- `/blog/why-i-started-a-personal-website/`
- `/blog/deploy-nextjs-with-cloudflare-pages/`
- `/blog/world-cup-live-project-notes/`
- `/blog/google-adsense-review-checklist/`
- `/blog/ai-assisted-development-practice/`
- `/about/`
- `/contact/`
- `/privacy/`
- `/terms/`
- `/projects/`
- `/ads.txt`
- `/robots.txt`
- `/sitemap-index.xml`
