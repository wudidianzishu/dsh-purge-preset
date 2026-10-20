# dsh-purge-preset

[English](README.en.md) | 中文

给 DeepSeek Harness（dsh）加一个名为 **破甲模式** 的 Agent Preset。

走的是官方预设通道：不注入宿主文件、不改一行 dsh 代码、不加密提示词，升级 dsh 也不丢。

安装后它会和「标准模式 / PTC / 极简 / 创造」并列出现在模式选择器里。

---

## 它是什么

一个 `@deepseek-ai/dsh-agent-preset` 声明，以官方 `standard.patch.yml` 为母本：

- 插件清单**原样保留**（22 个顶层条目、含分组内子项共 32 个：文件读写、命令执行、搜索、子智能体、计划模式、压缩……）
- 只把 `persona` 段整块替换成一条 30KB 的破甲提示词
- 用 `complete: true` 让这段成为**唯一**的系统提示词

```
standard 的 22 个插件条目  ← 不动
        +
persona.prefix  = 破甲正文（30,634 字节）
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

**代价**：工具的使用说明（何时用、怎么组合）会被一并移除。但**工具的 schema 不在这里**——它作为独立字段直接发给模型，所以工具照常可用，只是没了说明书。

实测验证：`complete: true` 生效后，`request/header` 里的工具清单（`read` / `edit` / `glob` / `grep` / `pwsh` / `present` …）一个不少。

---

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

1. **工具说明书被移除**。`complete: true` 会砍掉所有其他提示词段，工具 schema 仍在但使用指导没了。复杂任务可能不如标准模式顺手。
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
