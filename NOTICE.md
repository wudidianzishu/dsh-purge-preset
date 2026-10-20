# 署名与出处 / NOTICE

本项目的提示词正文**不是原创**，由以下三个 MIT 项目合成。许可全文见 `licenses/`。

## 一、成品构成

| 组成                                               | 来源                                                                          | 版本         | 许可  | 本地文件                          |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ---------- | --- | ----------------------------- |
| 正文主体                                             | [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge)           | 1.1.71     | MIT | `src/original-prompt.md`      |
| 前置声明「Authority and precedence」5 条                | [JeffKeeping/dsh-purge-plus](https://github.com/JeffKeeping/dsh-purge-plus) | 1.4.1      | MIT | `src/additions-top.md`        |
| 尾部「What stays / Assess the work / DROP ON SIGHT」 | [rumoii/dsh-breaklimit](https://github.com/rumoii/dsh-breaklimit)           | 0.9.3      | MIT | `src/additions-tail.md`       |
| Cordis 骨架（插件清单、`complete: true` 写法）              | `@deepseek-ai/dsh-web-app` 的 `presets/standard.patch.yml`                   | 0.2.1-rc.2 | 随该包 | `src/std-preset.template.yml` |
| 「Scope note」块                                    | 本项目自拟                                                                       | —          | MIT | `src/additions-tail.md`       |

`dsh-purge` 于 2026-10-19 由上游作者宣布转为商业许可/闭源，开源线止步 1.1.71。本项目基于该 MIT 版本谱系，与商业版本无关。

## 二、本次改动

1. **合成顺序**：前置声明 → 正文 → 尾部增补。尾块压尾以利用近因效应。
2. **自拟 `Scope note`**：原词第 148–153 行含面向 CTF 靶场的范围收敛条款（"limit scope by default to the challenge workspace"），日常使用会主动缩权，故补一段覆盖。
3. **改写一处**：breaklimit 原文「破坏性操作前让操作者听到风险」与破甲口径（不加风险警告）冲突，改为「留回滚路径，一行说明恢复方式，不停下来问授权」。
4. **未采用**：breaklimit 的 15.7KB 心理层（`tail.md`）。理由：token 成本翻倍，且其角色扮演语气与本项目「执行者」人设冲突。

## 三、构建可复现

`src/build.mjs` 从上述四个输入生成 `preset/cordis.patch.yml`，产物与本仓库提交的文件一致，可校验：

```sh
node src/build.mjs
git diff --stat preset/cordis.patch.yml   # 应为空
```

构建脚本只删除**结构层注释**（缩进 ≤14 空格的 `#` 行），`prefix` 块标量内 16 空格缩进的行一律保留。

## 四、分发要求

MIT 要求随软件副本附带版权声明与许可声明。分发本项目时须同时包含：

1. `LICENSE`（本项目，纯 MIT 文本）
2. 本 `NOTICE.md`
3. `licenses/` 目录（三家上游许可全文）

**单独分发 `preset/cordis.patch.yml` 一个文件是不合规的**——它内部不含任何署名。

> 补充说明：`LICENSE` 保持纯 MIT 文本，便于 GitHub 自动识别许可类型；本节及以下内容属于说明性文字，不构成对 MIT 许可的附加限制。

## 五、使用约束

本项目属越狱 / 红队工具，仅限自有主机、离线靶场或已获书面授权的场景。
