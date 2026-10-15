import { timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();
const securityHeaders = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
  "Vary": "Authorization",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Content-Security-Policy": "frame-ancestors 'self'",
};

function reply(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders, ...headers },
  });
}

async function authorized(header, username, password) {
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header ?? "");
  if (!match) return false;
  let credentials;
  try {
    const bytes = Uint8Array.from(atob(match[1]), (character) => character.charCodeAt(0));
    credentials = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(credentials)),
    crypto.subtle.digest("SHA-256", encoder.encode(`${username}:${password}`)),
  ]);
  return timingSafeEqual(new Uint8Array(actual), new Uint8Array(expected));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/study" && !url.pathname.startsWith("/study/")) {
      return reply("Not found", 404);
    }
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      url.protocol = "https:";
      return reply(null, 308, { Location: url.href });
    }
    // Challenge under /study/ so browsers scope remembered credentials to the section.
    if (url.pathname === "/study") {
      url.pathname = "/study/";
      return reply(null, 308, { Location: url.href });
    }
    // Missing secrets must never turn authentication off.
    if (!env.STUDY_BASIC_USER || !env.STUDY_BASIC_PASSWORD || env.STUDY_BASIC_USER.includes(":")) {
      return reply("学习资料认证尚未配置，请联系站点管理员。", 503);
    }
    if (!await authorized(request.headers.get("Authorization"), env.STUDY_BASIC_USER, env.STUDY_BASIC_PASSWORD)) {
      return reply("请使用学习资料的账号与密码登录。", 401, {
        "WWW-Authenticate": 'Basic realm="Spring Study", charset="UTF-8"',
      });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return reply("Method not allowed", 405, { Allow: "GET, HEAD" });
    }
    // Assets are reached only after authentication, including raw HTML and redirects.
    const assetRequest = new Request(request);
    assetRequest.headers.delete("Authorization");
    const assetResponse = await env.ASSETS.fetch(assetRequest);
    const response = new Response(assetResponse.body, assetResponse);
    for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
    return response;
  },
};
