/** Native Sätteri plugin: keep table semantics and add keyboard scroll targets. */
export default function readableBlocks() {
  return {
    name: "readable-blocks",
    before(_root, ctx) { ctx.data.readableBlocks = { code: 0, table: 0 }; },
    element: {
      filter: ["pre", "table", "th"],
      visit(node, ctx) {
        const props = node.properties ?? {};
        const counts = ctx.data.readableBlocks;
        if (node.tagName === "pre") {
          counts.code++;
          ctx.setProperty(node, "tabIndex", 0);
          ctx.setProperty(node, "role", props.role ?? "region");
          ctx.setProperty(node, "ariaLabel", props.ariaLabel ?? `代码示例 ${counts.code}，可横向滚动`);
        } else if (node.tagName === "th") {
          const row = ctx.parent(node);
          if (row && ctx.parent(row)?.tagName === "thead" && !props.scope) ctx.setProperty(node, "scope", "col");
        } else {
          counts.table++;
          const classes = ctx.parent(node)?.properties?.className ?? [];
          if (Array.isArray(classes) && classes.includes("table-scroll")) return;
          ctx.wrapNode(node, {
            type: "element", tagName: "div",
            properties: {
              className: ["table-scroll"], tabIndex: 0, role: "region",
              ariaLabel: `数据表格 ${counts.table}，可横向滚动`,
            },
            children: [],
          });
        }
      },
    },
  };
}
