#!/usr/bin/env node
/* ============================================================
   一键初始化 Supabase 项目
   用法：node tools/setup-supabase.mjs <sbp_开头的Token> [项目名]
   作用：1) 找到项目  2) 执行 supabase/schema.sql  3) 取回 URL 与 anon key
        4) 写入 assets/config.js  5) 打印新生成的凭证密码
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TOKEN = process.argv[2] || process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_NAME = process.argv[3] || 'drama-card';
const API = 'https://api.supabase.com/v1';

if (!TOKEN.startsWith('sbp_')) {
  console.error('❌ 需要一个 sbp_ 开头的 Personal Access Token');
  process.exit(1);
}

const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function call(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
  }
  return data;
}

const log = (s) => console.log(s);

/* ---------- 1. 找项目 ---------- */
log('① 查找项目 …');
const projects = await call('GET', '/projects');
const target = projects.find((p) => p.name === PROJECT_NAME)
  || projects.find((p) => p.name.toLowerCase().includes(PROJECT_NAME.toLowerCase()));

if (!target) {
  console.error(`❌ 没找到名为 ${PROJECT_NAME} 的项目。你现有的项目：`);
  projects.forEach((p) => console.error(`   - ${p.name}  (${p.id}, ${p.region})`));
  process.exit(1);
}

const REF = target.id;
const URL = `https://${REF}.supabase.co`;
log(`   项目 ${target.name} · ${target.region} · ${target.status}`);
if (target.status !== 'ACTIVE_HEALTHY') {
  log(`   ⚠️ 状态是 ${target.status}，数据库可能还没就绪，继续尝试…`);
}

/* ---------- 2. 执行 schema.sql ---------- */
log('② 执行 schema.sql（建表 + 函数 + 生成凭证）…');
const schema = fs.readFileSync(path.join(ROOT, 'supabase/schema.sql'), 'utf8');

let rows;
try {
  rows = await call('POST', `/projects/${REF}/database/query`, { query: schema });
} catch (e) {
  console.error('❌ 建表失败：');
  console.error(e.message);
  process.exit(1);
}

const codes = Array.isArray(rows) ? rows.map((r) => r.code).filter(Boolean) : [];
log(`   完成，返回 ${Array.isArray(rows) ? rows.length : 0} 行，其中密码 ${codes.length} 个`);

/* ---------- 3. 取 API 配置 ---------- */
log('③ 取回 Project URL 与 anon key …');
const keys = await call('GET', `/projects/${REF}/api-keys?reveal=true`);

const legacyAnon = keys.find((k) => k.name === 'anon' && k.api_key);
const publishable = keys.find((k) => k.type === 'publishable' || /publishable/i.test(k.name || ''));
const anonKey = legacyAnon?.api_key || publishable?.api_key || '';

if (!anonKey) {
  console.error('❌ 没有取到可用的 anon / publishable key。接口返回：');
  console.error(JSON.stringify(keys.map((k) => ({ name: k.name, type: k.type })), null, 2));
  process.exit(1);
}
log(`   key 类型：${legacyAnon ? 'legacy anon (JWT)' : 'publishable'}，长度 ${anonKey.length}`);

/* ---------- 4. 写 config.js ---------- */
log('④ 写入 assets/config.js …');
const cfg = `/* ============================================================
   配置：已在 ${new Date().toISOString().slice(0, 10)} 自动写入
   项目：${target.name} (${REF}, ${target.region})
   anon key 是公开密钥，可以放在前端代码里，安全性由 RLS + 函数保证
   ============================================================ */
window.DRAMA_CONFIG = {

  SUPABASE_URL: '${URL}',

  SUPABASE_ANON_KEY: '${anonKey}'

};
`;
fs.writeFileSync(path.join(ROOT, 'assets/config.js'), cfg, 'utf8');
log('   已写入');

/* ---------- 5. 输出密码 ---------- */
log('');
if (codes.length) {
  log('════════ 凭证密码（只显示这一次，请立刻保存）════════');
  codes.forEach((c, i) => log(`  ${String(i + 1).padStart(2, '0')}. ${c}`));
  log('═══════════════════════════════════════════════════');
  fs.writeFileSync(path.join(ROOT, 'supabase/codes-backup.txt'),
    `生成的凭证密码 · ${new Date().toLocaleString('zh-CN')}\n每个可用 3 次\n\n${codes.join('\n')}\n`, 'utf8');
  log(`已同时保存一份到 supabase/codes-backup.txt（这个文件不要提交到公开仓库）`);
} else {
  log('⚠️ 本次没有返回新密码（说明密码已经生成过了，未重复插入）');
  log('   在 SQL Editor 执行这条可以查看：');
  log('   select code, used, max_uses from public.drama_codes order by created_at;');
}

log('');
log(`✅ 完成。前端地址：${URL}`);
