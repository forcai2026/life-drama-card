import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/* 从 app.js 里读出真实的剧本键，避免用错键名导致"验证通过但分享页打不开" */
const app = fs.readFileSync('assets/app.js', 'utf8');
const seg = app.slice(app.indexOf('var PLAYS = {'), app.indexOf('\n  };', app.indexOf('var PLAYS = {')));
const KEYS = [...seg.matchAll(/^    ([a-z0-9_]+):\s*\{/gm)].map((m) => m[1]);

const cfg = fs.readFileSync('assets/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL:\s*'([^']+)'/)[1];
const K = cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)[1];
const sb = createClient(U, K, { auth: { persistSession: false } });

const CODE = process.argv[2];
const PLAY = process.argv[3] || KEYS[0];
if (!CODE) { console.error('用法: node tools/e2e.mjs <密码> [剧本键]'); process.exit(1); }
if (!KEYS.includes(PLAY)) { console.error('剧本键不存在:', PLAY, '可用:', KEYS.join(',')); process.exit(1); }

const ok = (n, cond, msg) => console.log(`${cond ? '✅' : '❌'} ${n}\n   ${msg}`);
let bad = 0;
const fail = (n, msg) => { console.log(`❌ ${n}\n   ${msg}`); bad++; };

/* 0. 非法剧本键必须先被拦下（且不消耗会话） */
const rBad = await sb.rpc('submit_result', {
  p_token: 'probe_invalid_token', p_play: 'not_a_play', p_age: 29, p_score: 8, p_dims: {},
});
ok('非法剧本键被拦下', rBad.data && rBad.data.ok === false && /不完整/.test(rBad.data.msg || ''),
  `返回 ${JSON.stringify(rBad.data)}`);

/* 1. 兑换 */
const r1 = await sb.rpc('redeem_code', { p_code: CODE });
if (r1.error) { console.log('❌ redeem_code 报错:', r1.error.message); process.exit(1); }
const d1 = r1.data;
ok('兑换密码', d1.ok === true, `token=${String(d1.token).slice(0, 12)}…  剩余 ${d1.remaining}/${d1.max}`);
if (!d1.ok) process.exit(1);

/* 2. 提交结果（八维取真实键名） */
const dims = { act: 0.72, oth: 0.31, msk: 0.64, wait: 0.28, rep: 0.55 };
const r2 = await sb.rpc('submit_result', {
  p_token: d1.token, p_play: PLAY, p_age: 29, p_score: 8.4, p_dims: dims,
});
if (r2.error) { console.log('❌ submit_result 报错:', r2.error.message); process.exit(1); }
const d2 = r2.data;
ok('提交结果', d2.ok === true && /^[a-z0-9]{10,14}$/.test(d2.share || ''), `share_id = ${d2.share}`);
if (!d2.ok) process.exit(1);

/* 3. 重复提交必须被拒 */
const r3 = await sb.rpc('submit_result', {
  p_token: d1.token, p_play: PLAY, p_age: 29, p_score: 8.4, p_dims: dims,
});
ok('重复提交被拒', r3.data && r3.data.ok === false, `返回 ${JSON.stringify(r3.data)}`);

/* 4. 分享页读回，且剧本键必须在前端可渲染的白名单里 */
const r4 = await sb.rpc('get_result', { p_share: d2.share });
const d4 = r4.data || {};
ok('分享页读回', d4.ok === true && KEYS.includes(d4.play),
  `play=${d4.play}（可渲染=${KEYS.includes(d4.play)}）  age=${d4.age}  score=${d4.score}  dims 齐全=${!!(d4.dims && Object.keys(d4.dims).length === 5)}`);

/* 5. 伪造分享码读不到 */
const r5 = await sb.rpc('get_result', { p_share: 'aaaaaaaaaa' });
ok('伪造分享码读不到', r5.data && r5.data.ok === false, `返回 ${JSON.stringify(r5.data)}`);

console.log('\n分享页地址：');
console.log(`https://life-drama-card.app.workbuddy.host/?sharecode=HQWDWU6YPC&r=${d2.share}`);
process.exit(bad ? 1 : 0);
