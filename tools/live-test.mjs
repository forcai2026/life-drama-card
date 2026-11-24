#!/usr/bin/env node
/* 对真实 Supabase 项目做连通性与权限测试（不消耗任何真实密码） */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(import.meta.dirname, '..');
const cfgText = fs.readFileSync(path.join(ROOT, 'assets/config.js'), 'utf8');
const URL = cfgText.match(/SUPABASE_URL:\s*'([^']+)'/)[1];
const KEY = cfgText.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)[1];

console.log('URL :', URL);
console.log('KEY :', KEY.slice(0, 22) + '…' + ` (${KEY.length} 位)`);
console.log('');

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}`);
  console.log(`   ${detail}`);
};

/* ---------- 1. REST 端点是否在线 ---------- */
{
  const r = await fetch(URL + '/rest/v1/', { headers: { apikey: KEY } });
  record('数据 API 在线', r.status < 500,
    `GET /rest/v1/ → HTTP ${r.status}${r.status === 404 ? '（根路径 404 是正常的，说明 PostgREST 在跑）' : ''}`);
}

/* ---------- 2. get_result 函数可调用 ---------- */
{
  const { data, error } = await sb.rpc('get_result', { p_share: 'zzzzzzzzzz' });
  if (error) {
    record('get_result 可调用', false, `错误：${error.code || ''} ${error.message}`);
  } else {
    record('get_result 可调用', data && data.ok === false,
      `返回 ${JSON.stringify(data)}（不存在的分享码应返回 ok:false）`);
  }
}

/* ---------- 3. redeem_code 可调用 + 错误分支正确 ---------- */
{
  const { data, error } = await sb.rpc('redeem_code', { p_code: 'ZZZZZZZZ' });
  if (error) {
    record('redeem_code 可调用', false, `错误：${error.code || ''} ${error.message}`);
  } else {
    const ok = data && data.ok === false && /没有这个密码/.test(data.msg || '');
    record('redeem_code 可调用', !!ok, `返回 ${JSON.stringify(data)}`);
  }
}

/* ---------- 4. 前端拿不到表（RLS 生效） ---------- */
{
  const { data, error } = await sb.from('drama_codes').select('code').limit(1);
  const blocked = !!error || (Array.isArray(data) && data.length === 0);
  record('密码表不可被前端读取', blocked,
    error ? `查询被拒绝：${error.code || ''} ${error.message}` : `返回 ${JSON.stringify(data)}（空数组即正确）`);
}

/* ---------- 5. 函数是否存在（防止建表脚本只跑了一半） ---------- */
{
  const names = ['redeem_code', 'submit_result', 'get_result'];
  for (const n of names) {
    const { error } = await sb.rpc(n, n === 'get_result'
      ? { p_share: 'x' }
      : n === 'redeem_code'
        ? { p_code: 'x' }
        : { p_token: 'x', p_play: 'x', p_age: 1, p_score: 1, p_dims: {} });
    const missing = error && /could not find the function|does not exist|PGRST202/i.test(error.message || '');
    record(`函数 ${n} 存在`, !missing, missing ? `缺失：${error.message}` : '存在');
  }
}

console.log('');
const bad = results.filter((r) => !r.pass);
if (bad.length === 0) {
  console.log('🎉 全部通过：数据库已就绪，前端可以正常调用');
} else {
  console.log(`⚠️ ${bad.length} 项失败：${bad.map((b) => b.name).join('、')}`);
  process.exitCode = 1;
}
