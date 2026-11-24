// 通过 Supabase Management API 执行 SQL（绕过剪贴板，字符不会被改坏）
// 用法：node tools/sql.mjs "select 1"   或   node tools/sql.mjs --file supabase/schema.sql
import fs from 'node:fs';

const PROJECT = 'mnbzqtukqapopgzjnlbo';
const TOKEN = process.env.SB_TOKEN;
if (!TOKEN) { console.error('缺少 SB_TOKEN 环境变量'); process.exit(1); }

const arg = process.argv[2];
if (!arg) { console.error('用法: node tools/sql.mjs "<sql>" | --file <path>'); process.exit(1); }
const query = arg === '--file' ? fs.readFileSync(process.argv[3], 'utf8') : arg;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});

const text = await res.text();
console.log('HTTP', res.status);
try {
  const j = JSON.parse(text);
  console.log(JSON.stringify(j, null, 2).slice(0, 4000));
} catch {
  console.log(text.slice(0, 4000));
}
process.exit(res.ok ? 0 : 1);
