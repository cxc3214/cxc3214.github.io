---
title: JSON 格式化后，为什么订单号末位变了？一次真实的工具检查
description: 用工具站实测大整数、重复键和非法逗号，区分排版成功与数据保真，并提供可直接运行的 Node.js 回归样例。
date: 2026-09-19
tags: ["JSON", "数据精度", "工具实测"]
topic: data
kind: 排查记录
scope: 2026 年 9 月 19 日对 tools.imspring.cn 的 JSON 格式化功能进行的四组人工检查，另以 Node.js 22.21.1 验证语言行为。全部是虚构数据，不代表其他工具或未来版本的结果。
---

复制一段接口响应到格式化工具，缩进变整齐了，页面也显示“完成”，是不是就可以放心复制回去？这次检查发现，至少对超出 JavaScript 安全整数范围的数字，答案是否定的。风险不是显示难看，而是一个看似成功的操作已经改变了字段值。

本文用本站的[开发工具箱](https://tools.imspring.cn/)做实际检查，公开输入、输出和限制。它不是工具推荐广告，也不把本站工具当成例外：下面的问题在这次检查中确实发生了，涉及此类数据时不应直接使用其当前格式化结果。

## 先复现：末位从 3 变成了 2

在工具箱选择“JSON 格式化”，粘贴以下虚构数据，然后点击“运行”：

```json
{"id":9007199254740993,"code":"00123","amount":"19.90","active":false,"note":null}
```

这次页面输出如下。请先比较 `id`，而不是比较空格：

```json
{
  "id": 9007199254740992,
  "code": "00123",
  "amount": "19.90",
  "active": false,
  "note": null
}
```

<a href="/images/json-number-precision.png"><img src="/images/json-number-precision.png" width="1265" height="712" loading="lazy" decoding="async" alt="2026 年 9 月 19 日实测：左侧输入的 id 以 993 结尾，右侧格式化结果以 992 结尾，页面仍显示完成；点击查看原图" /></a>

截图是当次页面的完整观察，测试数据均为虚构。它证明这个输入在当时的工具中发生了变化，不证明所有 JSON 工具都会采用同样的处理方式。

我又做了三组对照，总共四次操作：

| 输入变化 | 当次页面结果 | 能得出的结论 |
| --- | --- | --- |
| 上面的数字型 `id` | 输出 `9007199254740992` | 格式化成功不保证数值保真 |
| 只把 `id` 改为字符串 `"9007199254740993"` | 原样保留末位 3 | 字符串方案在此测试中保留了标识符 |
| `{"status":"draft","status":"published"}` | 只剩 `"status": "published"` | 重复键没有得到冲突提示 |
| `{"active":false,}` | 提示处理失败 | 能拦住语法错误，不等于能拦住数据风险 |

## 这不是 JSON 禁止大整数，而是解析器有精度边界

JSON 是数据交换格式；解析器把它转换成自己运行环境中的值。在 JavaScript 中，常规 Number 使用二进制浮点表示，安全整数上界是 `9007199254740991`，也就是 `2^53 - 1`。超出范围后，并不是每个整数都会立刻显示错误，而是相邻整数不再保证可以区分。

这会带来一个容易误写的测试：把两个超大数字直接写成 JavaScript 数字字面量再比较。两个字面量自身可能已经落到同一个可表示值，比较相等不能证明输入正确。下面的检查从原始文本开始，再检查字符串输出：

```js
const parsed = JSON.parse('{"id":9007199254740993}');
console.log(String(parsed.id));             // '9007199254740992'
console.log(Number.isSafeInteger(parsed.id)); // false
```

这里用原生解析复现了与页面一致的现象；本次没有检查工具站内部实现，不能仅凭结果断言它具体调用了哪个函数。语言机制可核对 [MDN 的安全整数说明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)。

## 标识符在传输前就应保留为字符串

订单号、流水号和带前导零的编码，通常用于识别，不用于加减。接口可以约定它们为字符串：

```json
{"id":"9007199254740993","code":"00123"}
```

关键是“传输前”：如果服务端先转成不精确的浮点数，或者浏览器已经按 Number 解析，再执行 `String(value)` 只能把错误值变成字符串，不能恢复原始末位。应回到仍保留原始精度的数据源，重新输出符合契约的字段。

需要整数计算时，可以在确认输入格式后把字符串转为 `BigInt`。这并不意味着 `JSON.stringify` 默认能直接输出 BigInt；序列化方式也要明确约定，例如边界处转回十进制字符串。不要把所有数字批量加引号，因为年龄、数量等字段的消费方可能确实要求 number。

对于必须接收数字形式大整数的协议，应选用保留原始数字文本的解析方案。仅在解析后对已经损失精度的 `value` 调用 `BigInt(value)` 无法补救；支持新式 reviver 上下文的环境可以访问原始 `context.source`，但必须检查目标环境支持情况。详见 [JSON.parse 文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)。

## 重复键、空值与布尔值也要按契约核对

实测中的重复 `status` 只留下后一个值。如果用它表示审批或发布状态，丢掉前一个键的过程值得报告，而不是当作“压缩成功”。[RFC 8259 第 4 节](https://www.rfc-editor.org/rfc/rfc8259.html#section-4)建议对象成员名称唯一；不同实现对重复名称的行为可能不同，因此不能把“某个解析器能读”当成跨系统约定。

空字符串、null、字段缺失、false 也不是一回事。这个差异需要在业务输入检查中明确，不能让格式化工具猜测：

| 输入 | 可能表达的约定 | 不应自动做的转换 |
| --- | --- | --- |
| `"code":"00123"` | 保留编码位数 | 转成数字 123 |
| `"note":null` | 明确给出空值 | 擅自删除字段 |
| 没有 `note` 键 | 未提供该字段 | 自动补成空字符串 |
| `"active":false` | 布尔关闭状态 | 与字符串 `"false"` 混用 |

例如 JavaScript 的 `Boolean("false")` 是 true，因为它是非空字符串。要接收文本布尔值，应显式校验允许值并映射；不应把通用真值转换当作业务校验。这是语言层面的补充测试，不是上面四次页面操作之一。

## 把例子变成可以重复运行的检查

以下脚本不访问网络、不读取业务文件，使用 Node.js 内置断言。保存为 `json-fidelity-checks.mjs` 后运行 `node json-fidelity-checks.mjs`；也可以<a href="/examples/json-fidelity-checks.mjs" download="json-fidelity-checks.mjs">下载同一份脚本</a>。本站测试会核对文章中的代码与下载文件一致。

```js
// json-fidelity-checks.mjs
import assert from 'node:assert/strict';

const lossy = JSON.parse('{"id":9007199254740993}');
assert.equal(String(lossy.id), '9007199254740992');
assert.equal(Number.isSafeInteger(lossy.id), false);

const exact = JSON.parse('{"id":"9007199254740993","code":"00123"}');
assert.equal(exact.id, '9007199254740993');
assert.equal(exact.code, '00123');
assert.equal(String(BigInt(exact.id)), exact.id);
assert.throws(() => JSON.stringify({ id: BigInt(exact.id) }), TypeError);

assert.equal(JSON.parse('{"status":"draft","status":"published"}').status, 'published');
assert.throws(() => JSON.parse('{"active":false,}'), SyntaxError);
assert.equal(JSON.parse('{"active":false}').active, false);
assert.equal(Boolean('false'), true);
assert.equal(Object.hasOwn(JSON.parse('{"note":null}'), 'note'), true);
assert.equal(Object.hasOwn(JSON.parse('{}'), 'note'), false);

console.log('12 checks passed');
```

这 12 个断言在 Node.js 22.21.1 中通过。注意：脚本故意断言了“不理想的现象”，目的是把边界固定为可复现的证据，不是在证明格式化工具没有问题；它也不能代替浏览器页面测试。

## 实际排查时，按这个顺序保留证据

1. 先保存脱敏后的原始响应文本，不要只保存解析后的对象。
2. 确认字段契约：哪些是标识符、哪些要计算、哪些允许 null 或缺失。
3. 用最小虚构输入复现，比较字段和值，而不只看工具是否报错。
4. 在生产者与消费者两端加入相同的边界样例，明确重复键的处理策略。
5. 修改后重新检查浏览器结果和接口原文，不能用旧截图代替新版本验证。

测试时不要粘贴真实身份资料、密钥或完整生产响应。即使工具页面说明在浏览器内处理，也不能据此推断浏览器扩展、页面第三方脚本和运行环境都已经过安全审计。

本文没有修改工具站，也没有声称该问题已修复。后续若工具实现改变，应在新版本上复测并保留修订记录。关于其他类型的“检查成功不等于结果可靠”，可继续阅读[APK 文件校验的边界](/blog/android-apk-download-verification/)与[赛事数据中的 null 和状态设计](/blog/world-cup-live-project-notes/)。
