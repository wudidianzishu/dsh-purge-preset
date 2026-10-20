// 构建脚本：合成提示词正文并生成 preset/cordis.patch.yml
//
// 用法：node src/build.mjs [输出路径]
// 默认输出 preset/cordis.patch.yml
//
// 输入（本目录）：
//   additions-top.md          前置授权声明（5 条）
//   original-prompt.md        正文主体
//   additions-tail.md         尾部增补（范围修正 / 工程纪律 / 只评审工作 / DROP ON SIGHT）
//   std-preset.template.yml   官方 standard.patch.yml 母本（仅取插件清单骨架）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');
const read = f => fs.readFileSync(path.join(here, f), 'utf8').replace(/\r\n/g, '\n').trimEnd();

const top = read('additions-top.md');
const orig = read('original-prompt.md');
const tools = read('additions-tools.md');
const tail = read('additions-tail.md');

// 1) 合成正文：前置声明 → 原文 → 工具说明书 → 尾部增补（尾块压尾，利用近因效应）
//    complete: true 会移除官方所有工具引导段，故工具说明书在此自备。
const prompt = `${top}\n\n${orig}\n\n${tools}\n${tail}\n`;
fs.writeFileSync(path.join(here, 'prompt-v2.md'), prompt, 'utf8');

// 2) 以官方 standard.patch.yml 为母本，替换 id / 名称 / 排序，并把 persona 段整块换掉
const lines = read('std-preset.template.yml').split('\n');

const iId = lines.findIndex(l => l.trim() === 'id: standard');
if (iId < 0) throw new Error('模板中未找到 id: standard');
lines[iId] = '        id: purge';
lines.splice(iId + 1, 0,
  '        name: 破甲模式',
  '        description: 官方预设通道的自包含破甲 Agent：整块替换系统提示词，工具集与标准模式一致。'
);

const iOrder = lines.findIndex(l => l.trim() === 'order: 1');
if (iOrder >= 0) lines[iOrder] = '        order: 2';

const iPrefix = lines.findIndex(l => l.trim().startsWith('prefix: You are a coding agent'));
if (iPrefix < 0) throw new Error('模板中未找到 persona 的 prefix 行');

const ind = ' '.repeat(16);
const body = prompt.split('\n').map(l => (l.length ? ind + l : '')).join('\n');
lines.splice(iPrefix, 1,
  '              prefix: |-',
  body,
  '              suffix: ""',
  '              complete: true',
  '              includeRuntimeContext: false'
);

// 3) 只删「结构层」注释（缩进 ≤14 空格）。prefix 是块标量，内容缩进 16 空格，
//    其中若出现以 # 开头的行必须保留，否则会损坏提示词正文。
const stripStructuralComments = text => text.split('\n').filter(line => {
  const m = line.match(/^( *)#/);
  if (!m) return true;
  return m[1].length > 14;
}).join('\n');

const out = stripStructuralComments(
  lines.join('\n')
    .replace(/- id: preset-standard/g, '- id: preset-purge')
    .replace(/# Agent preset standard:[\s\S]*?(?=\n- insert:)/, '')
).replace(/^\n+/, '');

const outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repo, 'preset', 'cordis.patch.yml');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out.endsWith('\n') ? out : out + '\n', 'utf8');

console.log('prompt-v2.md :', Buffer.byteLength(prompt), '字节,', prompt.split('\n').length, '行');
console.log('输出         :', outPath);
console.log('输出体积     :', Buffer.byteLength(out), '字节,', out.split('\n').length, '行');
console.log('正文净增     :', Buffer.byteLength(prompt.trimEnd()) - Buffer.byteLength(orig), '字节');
