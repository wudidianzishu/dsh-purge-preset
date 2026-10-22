# dsh-purge-preset

[English](README.en.md) | 中文

[![release](https://img.shields.io/github/v/release/wudidianzishu/dsh-purge-preset?color=2da44e)](https://github.com/wudidianzishu/dsh-purge-preset/releases)
![license](https://img.shields.io/badge/license-MIT-3da639)
![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.2-24292f)
![prompt](https://img.shields.io/badge/prompt-37%2C111%20bytes-8250df)

> **给 dsh 换一个脑子，不换它的手脚。**
>
> 官方预设通道 · 整块替换系统提示词 · 32 个工具一个不少 · 自带工具说明书

给 DeepSeek Harness（dsh）加一个名为 **破甲模式** 的 Agent Preset。

走的是官方预设通道：不注入宿主文件、不改一行 dsh 代码、不加密提示词，升级 dsh 也不丢。

安装后它会和「标准模式 / PTC / 极简 / 创造」并列出现在模式选择器里。

> **先说清楚**：这套更适合"主要想让模型听话、少拒绝、严格执行规则"的用法。
> 如果你的日常是重度工具链的复杂工程，先看 [适合谁，不适合谁](#适合谁不适合谁)——它可能不是你的最优解。

---

## 它是什么

一个 `@deepseek-ai/dsh-agent-preset` 声明，以官方 `standard.patch.yml` 为母本：

- 插件清单**原样保留**（22 个顶层条目、含分组内子项共 32 个：文件读写、命令执行、搜索、子智能体、计划模式、压缩……）
- 只把 `persona` 段整块替换，内容由四部分组成：前置授权声明 / 破甲正文 / **工具说明书** / 尾部增补（合计 37,111 字节）
- 用 `complete: true` 让这段成为**唯一**的系统提示词

```
standard 的 22 个插件条目  ← 不动
        +
persona.prefix  = 前置声明 + 破甲正文 + 工具说明书 + 尾部增补（37,111 字节）
persona.complete = true
        ↓
模式选择器里的「破甲模式」
```

## 它不是什么

| 常见做法                             | 本项目                        |
| -------------------------------- | -------------------------- |
| 往 `prompt-inject.md` 里灌词         | 不碰运行时文件                    |
| 打补丁改宿主源码                         | 不改任何 dsh 包                 |
| 把提示词加密进 asset-table              | 正文明文，可读可改                  |
| 写 `$DSH_HOME/.agent-presets/` 目录 | **该目录 0.2.x 已无人读取**，本项目不用它 |
| 替换整个 profile                     | 只追加一段 preset 声明            |

## 为什么不用插件：一次实测

本项目借用了 dsh-purge 的**提示词**（MIT），但没有借用它的**做法**——它靠改宿主文件实现效果，我们走官方预设通道。

两者差多少，我在 `0.2.1-rc.2` 上实测过一次（方法和数据都可复现）：

| 项 | 数字 |
|---|---|
| 与官方 npm 包存在差异的文件 | **40** |
| 其中带有作者标记 `[dsh-purge]` 的 | 39 |
| **没有留下任何标记的** | **1** |
| 改动规模（39 个带标记文件） | **+330 / −192 行** |

那 1 个静默改动在 `dsh-web-app/cordis.patch.yml`：

```diff
 - id: system-prompt
   config:
-    personaPrefix: >-
-      You are a coding agent powered by the {{model}} model.
+    personaPrefix: ""
```

这是**部署级**的身份行，对所有预设生效。更彻底的是——四个预设各自的 `prefix` 也被清成了空串：

| 预设 | 原值 | 改动后 |
|---|---|---|
| standard | `You are a coding agent powered by the {{model}} model.` | `""` |
| ptc | 同上 | `""` |
| minimal | `You are a helpful software engineer assistant.` | `""` |
| cordis | （原有多行身份描述） | `""` |

加上部署级那条，整个 web 端**一个身份行都不剩**——而它搜不到，因为没写标记。

由此带来三个后果：

1. **升级即失效** —— `npm i -g @deepseek-ai/dsh@latest` 会把 40 处改动一次性抹掉。同版本重装也不行：npm 看到版本相同，直接跳过文件替换（实测 39 个标记一个没少）
2. **改动不可审计** —— 连作者自己的标记都没覆盖全。想知道被改了什么，只能下载官方 tarball 逐个文件做哈希比对
3. **模式互相污染** —— 改的是宿主，"标准模式"也在被改之列。想拿破甲和标准做对照实验？标准已经不是原版了

本项目一行宿主文件都不碰，所以上面三条都不成立：`dsh` 升到任何版本，预设仍在 `~/.dsh/profiles/web/cordis.patch.yml` 里；删掉那段 YAML 就回到原状。

> 说句公道话：改宿主是实现"整段替换"最直接的路子，在官方 preset 通道成熟之前几乎是唯一选择。两条路各有代价，这里只陈述实测数据，不评价动机。

## 为什么用 `complete: true`

dsh 的 `minimal`（极简模式）预设本身就是这样写的：

```yaml
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: You are a helpful software engineer assistant.
    complete: true
    includeRuntimeContext: false
```

`complete` 让这段前缀成为唯一段落：官方身份、persona 后缀、工具引导、其他监听器都无法再追加文本。

**代价**：官方注册的工具引导段（`tool:*`、`plan:policy`、`subagent:delegation` 等）会一并被移除。但**工具的 schema 不在这里**——它作为独立字段直接发给模型，所以工具照常可用，只是没了说明书。

**因此本 preset 自备了一份工具说明书**（`src/additions-tools.md`）：按实际存在的 32 个工具写的 `INVENTORY` + `DISCIPLINE`。它替代不了官方原文，但覆盖了最影响实用性的三件事：**有哪些工具、什么时候该用、以及"先看再改、改完验证"**。

实测验证：`complete: true` 生效后，`request/header` 里的工具清单（`read` / `edit` / `glob` / `grep` / `pwsh` / `present` …）一个不少。

---

## 适合谁，不适合谁

这套东西不是"全面升级版"，它**有取舍**。装之前先看你是哪种用法。

### 更适合：以"听话"为主要诉求

- 你要的是模型**少拒绝、少绕弯、严格按你定的规则走**
- 日常是问答案、写内容、按模板产出、执行明确步骤
- 你希望它**升级不丢**、随时能一键回滚、配置可读可改

这条路的价值在"稳"：官方通道、正文明文、不动宿主。坏了删一段 YAML 就回去了。

### 不太适合：重度依赖工具链的复杂工程

- 日常是跨仓库重构、长链路调试、多工具编排
- 你依赖官方那套"什么时候该用哪个工具"的**原生指导**
- 你希望子代理、计划模式、上下文压缩都保持官方调校

原因很实在：`complete: true` 会把官方注册的工具引导段一并移除。本项目补了一份自备说明书（32 个工具的清单与纪律），但——

> **那是我们自己写的，不是官方原文。** 官方改版后它可能滞后，细节上也不如原生指导贴合。

所以这类用法更实际的路线是：**在"传统 purge 改宿主"和"自定义注入"之间找平衡**——保留官方工具引导，只替换身份与规则段落。代价是又回到改宿主的那套问题（见上一节），所以这是个需要自己权衡的交换。

### 一句话选择

| 你的主要痛点 | 更合适的做法 |
|---|---|
| 模型太爱拒绝、太爱说教、不按规则走 | **本项目**：官方通道，稳定、可回滚、升级不丢 |
| 模型工具用不对、复杂工程掉链子 | 官方引导 + 局部注入；或用传统 purge 但保留工具段 |
| 两者都想要 | 两个 preset 并存，日常用本项目，重工程切回带官方引导的模式 |

后两种做法都比本项目"脏"一些，但**它们保留了你真正需要的东西**。工具链重度用户不必为了"少拒绝"牺牲工具质量——这本来就不是一道单选题。

## 安装

### 0. 环境

- dsh **0.2.1-rc.2**（npm 全局安装的版本）
- 以 `web` profile 为例，其他 profile 同理

```sh
dsh --version   # 应输出 0.2.1-rc.2
```

### 1. 备份现有补丁层

```sh
# Windows Git Bash
cp ~/.dsh/profiles/web/cordis.patch.yml ~/.dsh/profiles/web/cordis.patch.yml.bak
```

### 2. 追加 preset 声明

`cordis.patch.yml` 是一个顶层 YAML 数组，把 `preset/cordis.patch.yml` 的内容追加到末尾即可。

```sh
cat preset/cordis.patch.yml >> ~/.dsh/profiles/web/cordis.patch.yml
```

### 3. 预演（不要跳过）

```sh
dsh --dump-config --profile web | grep -A3 "id: preset-purge"
```

应当看到 `preset-purge` 出现在配置树里，且**没有新增 warning**。

### 4. 重启

```sh
dsh web
```

> 注意：`dsh web` 是单实例，端口 3080 被占用时新实例会直接失败退出（`EADDRINUSE`）。重启前先关掉旧的。

---

## 验证

**第一步：能不能切过去**

新建会话 → 模式选择器 → 应出现「破甲模式」。

**第二步：工具还活不活**

让它做一件必须用工具的事，例如：

> 列一下当前目录的文件

能真的列出 → 工具正常。若它只干聊，说明需要给 prefix 补工具说明。

**第三步（可选）：确认会话真的用了这个 preset**

dsh 的会话日志是多帧 zstd，按魔数 `28 B5 2F FD` 切帧解压后，首行应包含：

```json
{"type":"session","version":4,"agentPreset":"purge"}
```

---

## 回滚

恢复备份即可，或删掉追加的那段：

```sh
cp ~/.dsh/profiles/web/cordis.patch.yml.bak ~/.dsh/profiles/web/cordis.patch.yml
```

重启后「破甲模式」从选择器消失。

---

## 已知限制

1. **官方工具引导被移除**。`complete: true` 会丢掉所有其他提示词段，包括官方为每个工具注册的短指南。本 preset 用自备的 `INVENTORY` + `DISCIPLINE` 替代——**不是官方原文**，官方改版后可能滞后，需要时请对照 `src/additions-tools.md` 自己补。
2. **同一作用域只能有一个 complete 段落**，多个会让提示词组装失败。
3. **`{{…}}` 是插值语法**。正文里若出现双花括号，会被当作变量引用；未注册的变量会让组装直接失败。本项目正文已确认 0 处 `{{`。
4. **只测过 npm 版 dsh**。Desktop（Electron）版有独立运行时和自己的 profile，CLI 不管理它（`dsh --dump-config --profile desktop` 会被拒绝）。
5. **不提供上游闭源版本**。本项目基于 MIT 时代的 1.1.71 谱系，与上游作者的商业版本无关。

---

## 目录结构

```
.
├── preset/
│   └── cordis.patch.yml     构建产物（无注释，可直接追加进 profile 补丁层）
├── src/
│   ├── build.mjs            构建脚本
│   ├── additions-top.md     前置授权声明（5 条）
│   ├── additions-tools.md   工具说明书（INVENTORY + DISCIPLINE）
│   ├── additions-tail.md    尾部增补（4 块）
│   ├── original-prompt.md   正文主体
│   └── std-preset.template.yml  官方 standard.patch.yml 母本（仅取骨架）
├── docs/
│   └── 安装与验证.md         含实测记录与自检结果
├── licenses/                三家上游的 MIT 许可全文
├── NOTICE.md                署名与出处
└── README.md
```

## 构建

```sh
node src/build.mjs
```

会重新生成 `src/prompt-v2.md` 与 `preset/cordis.patch.yml`。

改提示词只需改 `src/additions-*.md` 或 `src/original-prompt.md`，然后重跑构建。

构建脚本只删除**结构层注释**（缩进 ≤14 空格的 `#` 行）；`prefix` 块标量内的 16 空格缩进行一律保留，避免误删正文。

---

## 出处与署名

提示词正文并非原创，由三个 MIT 项目合成：

| 部分        | 来源                                                                          | 版本         |
| --------- | --------------------------------------------------------------------------- | ---------- |
| 正文主体      | [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge)           | 1.1.71     |
| 前置授权声明    | [JeffKeeping/dsh-purge-plus](https://github.com/JeffKeeping/dsh-purge-plus) | 1.4.1      |
| 尾部三块      | [rumoii/dsh-breaklimit](https://github.com/rumoii/dsh-breaklimit)           | 0.9.3      |
| Cordis 骨架 | `@deepseek-ai/dsh-web-app` 的 `presets/standard.patch.yml`                   | 0.2.1-rc.2 |

详细构成、改动说明与二次分发要求见 [NOTICE.md](NOTICE.md)。许可全文见 `licenses/`。

---

## 免责声明

本项目是越狱 / 红队工具，用于研究模型提示词组装机制。

**仅限自有主机、离线靶场或已获书面授权的场景使用。** 使用者的行为与后果由使用者自行承担，与作者无关。

请遵守所在地法律法规与目标软件的服务条款。
