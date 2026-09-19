export const topics = [
  { id: "web", name: "网站构建与发布", description: "从内容结构、构建产物到线上验证，搭建可持续维护的个人网站。" },
  { id: "engineering", name: "开发与交付", description: "用具体的检查方法，把生成的代码和下载的文件变成可核对的结果。" },
  { id: "data", name: "数据与产品设计", description: "拆解时间、状态和数据新鲜度，让页面呈现可信的信息。" },
] as const;

export function formatDate(date: Date) {
  return date.toLocaleDateString("zh-CN", { timeZone: "UTC" });
}
