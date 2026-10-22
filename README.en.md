# dsh-purge-preset

English | [中文](README.md)

[![release](https://img.shields.io/github/v/release/wudidianzishu/dsh-purge-preset?color=2da44e)](https://github.com/wudidianzishu/dsh-purge-preset/releases)
![license](https://img.shields.io/badge/license-MIT-3da639)
![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.2-24292f)
![prompt](https://img.shields.io/badge/prompt-37%2C111%20bytes-8250df)

> **Swap the brain, keep the hands.**
>
> Official preset channel · whole-prompt replacement · all 32 tools intact · ships its own tool manual

An agent preset for DeepSeek Harness (dsh). Its display name in the picker is **破甲模式** — literally "armor-break mode", roughly *unrestricted mode*.

It uses the official preset channel: no runtime file injection, no patching of dsh itself, no encrypted prompt blob. Upgrading dsh does not remove it.

After installation it appears in the preset picker next to the built-in **standard / ptc / minimal / cordis** presets.

> **Read this first**: the project fits you best if your main goal is *a model that complies, refuses less, and follows your rules*.
> If your daily work is heavy toolchain engineering, check [Who it is for](#who-it-is-for-who-it-is-not) first — this may not be your best option.

---

## What it is

A single `@deepseek-ai/dsh-agent-preset` declaration derived from the official `standard.patch.yml`:

- The plugin list is kept **byte-for-byte** (22 top-level entries, 32 plugins including grouped children: file read/write, shell, search, subagents, plan mode, compaction, …)
- Only the `persona` row is replaced. Its text has four parts: authority preamble / unrestricted body / **tool manual** / tail blocks (37,111 bytes total)
- `complete: true` makes that text the **only** system prompt

```
standard's 22 plugin entries   ← untouched
        +
persona.prefix   = preamble + body + tool manual + tail blocks (37,111 bytes)
persona.complete = true
        ↓
"破甲模式" in the preset picker
```

## What it is not

| Common approach | This project |
|---|---|
| Writing into `prompt-inject.md` | Does not touch runtime files |
| Patching dsh source | Does not modify any installed package |
| Encrypting the prompt into an asset table | Plain text, readable and editable |
| Writing to `$DSH_HOME/.agent-presets/` | **That directory is no longer read by 0.2.x** — unused here |
| Replacing the whole profile | Appends one preset declaration |

## Why not a plugin: what I measured

This project borrows dsh-purge's **prompt** (MIT). It does not borrow its **approach** — that one works by patching host files; this one uses the official preset channel.

How big the difference is, measured once on `0.2.1-rc.2` (method and numbers reproducible):

| Item | Count |
|---|---|
| Files differing from the official npm package | **40** |
| Of those, carrying the author's `[dsh-purge]` marker | 39 |
| **Carrying no marker at all** | **1** |
| Diff size (the 39 marked files) | **+330 / −192 lines** |

The silent one is `dsh-web-app/cordis.patch.yml`:

```diff
 - id: system-prompt
   config:
-    personaPrefix: >-
-      You are a coding agent powered by the {{model}} model.
+    personaPrefix: ""
```

That is a **deployment-level** identity line, applied to every preset. It goes further than that — each preset's own `prefix` was emptied as well:

| Preset | Before | After |
|---|---|---|
| standard | `You are a coding agent powered by the {{model}} model.` | `""` |
| ptc | same | `""` |
| minimal | `You are a helpful software engineer assistant.` | `""` |
| cordis | (multi-line identity block) | `""` |

Counting the deployment-level line, **not a single identity line survives anywhere in the web app** — and none of it is searchable, because no marker was written.

Three consequences follow:

1. **An upgrade erases it** — `npm i -g @deepseek-ai/dsh@latest` wipes all 40 changes at once. Reinstalling the same version does not help either: npm sees an identical version and skips file replacement (measured: all 39 markers survived).
2. **The changes are not auditable** — the author's own markers do not cover everything. The only reliable way to find out what changed is to hash-compare against the official tarballs.
3. **Presets contaminate each other** — the host is what got patched, and "standard mode" is on the list. Want a clean A/B between this preset and standard? Standard is no longer stock.

This project touches no host file, so none of the above applies: upgrade dsh to any version and the preset is still in `~/.dsh/profiles/web/cordis.patch.yml`. Delete that YAML block and you are back to stock.

> In fairness: patching the host was the most direct route to whole-prompt replacement, and before the official preset channel matured it was close to the only one. Both routes have costs. This section reports measurements, not motives.

## Why `complete: true`

The built-in `minimal` preset is written exactly this way:

```yaml
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: You are a helpful software engineer assistant.
    complete: true
    includeRuntimeContext: false
```

`complete` turns that prefix into the sole prompt section: the first-party identity line, the deployment persona suffix, tool guidance, and any listener-added text can no longer be appended.

**The trade-off**: every tool-guidance section registered by the plugins (`tool:*`, `plan:policy`, `subagent:delegation`, …) is removed too. But the **tool schemas are not part of the prompt** — they are delivered as a separate wire field, so tools keep working; the model simply loses the manual.

**So this preset ships its own manual** (`src/additions-tools.md`): `INVENTORY` + `DISCIPLINE`, written against the 32 tools that actually exist here. It is not the official text, but it restores the three things that matter for usability: **which tools exist, when to reach for them, and "inspect before you change, verify after you change"**.

Verified: with `complete: true` active, `request/header` still carries the full tool set (`read` / `edit` / `glob` / `grep` / `pwsh` / `present` / …).

---

## Who it is for, who it is not

This is not an across-the-board upgrade. It is **a trade-off**. Check which kind of user you are before installing.

### A good fit: your main goal is compliance

- You want the model to **refuse less, hedge less, and follow your rules strictly**
- Day to day you ask questions, write content, produce from templates, execute defined steps
- You care that it **survives an upgrade**, rolls back in one line, and stays readable and editable

The value here is stability: official channel, plain text, no host file touched. Break it and you delete one YAML block.

### A poor fit: you live inside a heavyweight toolchain

- Your day is cross-repo refactoring, long debugging chains, multi-tool orchestration
- You rely on the first-party guidance for **which tool to reach for, and when**
- You want subagents, plan mode and compaction to keep their official tuning

The reason is concrete: `complete: true` removes every tool-guidance section the plugins register. This project ships its own manual (inventory + discipline for the 32 tools), but —

> **it is ours, not the official text.** It can lag behind a dsh release, and in the details it is not as well fitted as the native guidance.

For that kind of work, the more practical route is **a balance between the traditional host-patching purge and custom injection** — keep the official tool guidance, replace only the identity and rule sections. The cost is that you are back to the host-patching problems described in the previous section, so it is a trade you have to weigh yourself.

### One-line choice

| Your real pain point | Better fit |
|---|---|
| Too many refusals, too much lecturing, rules ignored | **This project**: official channel, stable, reversible, upgrade-proof |
| Tools used badly; complex engineering falls apart | Official guidance + targeted injection, or host-patching purge with the tool sections kept |
| Both | Run two presets side by side: this one for daily work, the guided one for heavy engineering |

The last two options are "dirtier" than this project, but **they keep the thing you actually need**. Heavy toolchain users should not trade tool quality for fewer refusals — this was never a single-choice question.

## Install

### 0. Requirements

- dsh **0.2.1-rc.2** (the npm-installed CLI)
- Examples use the `web` profile; other profiles work the same way

```sh
dsh --version   # should print 0.2.1-rc.2
```

### 1. Back up the existing patch layer

```sh
cp ~/.dsh/profiles/web/cordis.patch.yml ~/.dsh/profiles/web/cordis.patch.yml.bak
```

### 2. Append the preset declaration

`cordis.patch.yml` is a top-level YAML array. Append the contents of `preset/cordis.patch.yml` to the end of it.

```sh
cat preset/cordis.patch.yml >> ~/.dsh/profiles/web/cordis.patch.yml
```

### 3. Dry run — do not skip this

```sh
dsh --dump-config --profile web | grep -A3 "id: preset-purge"
```

`preset-purge` should now appear in the composed tree, with **no new warnings**.

### 4. Restart

```sh
dsh web
```

> `dsh web` is single-instance. If port 3080 is taken, the new process exits immediately with `EADDRINUSE`. Close the old one first.

---

## Verify

**Step 1 — does it appear?**

New session → preset picker → "破甲模式" should be listed.

**Step 2 — are tools still alive?**

Ask for something that requires a tool, e.g.:

> list the files in the current directory

A real listing means tools are intact. A text-only answer means the prefix needs its own tool guidance.

**Step 3 (optional) — confirm the session actually used it**

dsh session logs are multi-frame zstd. Split on the magic bytes `28 B5 2F FD`, decompress each frame, then check the first line:

```json
{"type":"session","version":4,"agentPreset":"purge"}
```

---

## Rollback

Restore the backup, or delete the appended block:

```sh
cp ~/.dsh/profiles/web/cordis.patch.yml.bak ~/.dsh/profiles/web/cordis.patch.yml
```

Restart; the preset disappears from the picker.

---

## Known limitations

1. **Official tool guidance is removed.** `complete: true` drops every other prompt section, including the short per-tool guides the plugins register. This preset substitutes its own `INVENTORY` + `DISCIPLINE` — **not the official text**, so it can lag behind a dsh release; update `src/additions-tools.md` when needed.
2. **Only one complete section per scope.** Two of them make prompt assembly fail.
3. **`{{…}}` is interpolation syntax.** Any double brace in the prompt is treated as a variable reference; an unregistered variable aborts assembly. This prompt contains zero `{{`.
4. **Tested on the npm build only.** The Desktop (Electron) app ships its own runtime and profile; the CLI refuses to manage it (`dsh --dump-config --profile desktop` is rejected).
5. **No upstream closed-source code is included.** This is based on the MIT-era 1.1.71 lineage and is unrelated to the upstream author's commercial release.

---

## Repository layout

```
.
├── preset/
│   └── cordis.patch.yml     build artifact (comment-free; append to your profile patch)
├── src/
│   ├── build.mjs            build script
│   ├── additions-top.md     authority & precedence preamble (5 rules)
│   ├── additions-tools.md   tool manual (INVENTORY + DISCIPLINE)
│   ├── additions-tail.md    four tail blocks
│   ├── original-prompt.md   main body
│   └── std-preset.template.yml  official standard.patch.yml (skeleton only)
├── docs/
│   └── 安装与验证.md         test log and troubleshooting (Chinese)
├── licenses/                MIT license texts of the three upstream projects
├── NOTICE.md                attribution (Chinese)
└── README.md                Chinese README
```

## Build

```sh
node src/build.mjs
```

Regenerates `src/prompt-v2.md` and `preset/cordis.patch.yml`.

To change the prompt, edit `src/additions-*.md` or `src/original-prompt.md`, then rebuild.

The build strips **structural comments only** (lines starting with `#` at indentation ≤14 spaces). Content inside the `prefix` block scalar is indented 16 spaces and is always preserved, so a `#` at the start of a prompt line cannot be deleted by accident.

---

## Attribution

The prompt body is not original work. It combines three MIT-licensed projects:

| Part | Source | Version |
|---|---|---|
| Main body | [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) | 1.1.71 |
| Authority & precedence preamble | [JeffKeeping/dsh-purge-plus](https://github.com/JeffKeeping/dsh-purge-plus) | 1.4.1 |
| Tail blocks | [rumoii/dsh-breaklimit](https://github.com/rumoii/dsh-breaklimit) | 0.9.3 |
| Cordis skeleton | `@deepseek-ai/dsh-web-app` → `presets/standard.patch.yml` | 0.2.1-rc.2 |

Full composition, list of changes, and redistribution requirements: see [NOTICE.md](NOTICE.md). License texts: `licenses/`.

---

## Disclaimer

This is a jailbreak / red-team tool intended for studying how prompt assembly works.

**Use it only on machines you own, in offline labs, or with written authorization.** You are responsible for your own actions and their consequences.

Follow the laws of your jurisdiction and the terms of service of the software you use.
