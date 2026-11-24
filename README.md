# 你的人生剧本卡 · 在线版

18 题叙事测评，测出你反复在演哪一出。带凭证密码门禁、次数限制、结果长图导出与分享链接。

纯静态站点，前端托管在 GitHub Pages，数据与鉴权走 Supabase。无需构建、无框架。

---

## 目录结构

```
.
├── index.html              页面骨架
├── assets/
│   ├── style.css           全部样式
│   ├── app.js              全部逻辑（题库、计分、门禁、长图、分享）
│   ├── config.js           已填入本项目的 Supabase 地址与公开密钥
│   └── vendor/             本地化的依赖，不依赖任何 CDN
│       ├── supabase.js
│       └── html2canvas.min.js
├── supabase/
│   ├── schema.sql          数据库初始化脚本（建表 + 权限 + 生成密码）
│   ├── fix-01-token.sql    补丁：函数的 search_path 加 extensions（否则 gen_random_bytes 找不到）
│   └── fix-02-play-whitelist.sql 补丁：submit_result 校验剧本键与参数范围
└── tools/
    ├── live-test.mjs       对真实数据库做连通性/权限自检（不消耗密码）
    ├── e2e.mjs             全链路回归：兑换→提交→重提被拒→读回→伪造码
    ├── sql.mjs             用 Access Token 直接执行 SQL（不经过剪贴板）
    └── setup-supabase.mjs  用 Access Token 一键建表并写回 config.js
```

---

## 部署三步

### 第 1 步：建 Supabase 项目

1. 打开 https://supabase.com ，用邮箱注册并登录
2. 点 **New project**，填一个名字（比如 `drama-card`），数据库密码随便设一个强密码并记住，Region 选 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
3. 等 1–2 分钟，项目创建完成
4. 左侧 **SQL Editor** → **New query**，把 `supabase/schema.sql` 全部内容粘进去 → 点 **Run**
5. 执行结果里会返回 30 个 8 位密码。忘了保存也没关系——密码是明文存在表里的，随时能再查（见下文「凭证与次数管理」）

### 第 2 步：把两个值填进 config.js（本项目已完成）

左侧 **Settings → API Keys**，复制这两个：

| 页面上叫什么 | 填到 config.js 的 |
|---|---|
| Project URL | `SUPABASE_URL` |
| 可发布密钥（`sb_publishable_…`）或 anon public key | `SUPABASE_ANON_KEY` |

```js
window.DRAMA_CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_...'
};
```

> 这两个都是**公开**密钥，写在前端是正常设计。真正的防护在数据库里：三张表都开了行级安全且没有 policy，前端直接读表会拿到 `permission denied`，只能通过 `redeem_code` / `submit_result` / `get_result` 三个函数访问。
>
> ⚠️ **`sb_secret_` / service_role 密钥绝对不能写进前端**，它能绕过全部权限。

### 第 3 步：开 GitHub Pages

仓库 **Settings → Pages** → Source 选 **Deploy from a branch** → 分支 `main`、目录 `/ (root)` → Save。

等 1 分钟左右，访问 `https://<你的用户名>.github.io/<仓库名>/`。

---

## 凭证与次数管理

所有操作都在 Supabase **SQL Editor** 里执行。

**查看所有密码和剩余次数**（结果表格右上角可导出 CSV）

```sql
select code, used || '/' || max_uses as 已用, max_uses - used as 剩余, note, last_used_at
  from public.drama_codes order by created_at;
```

**把 30 个密码合成一格，方便一次复制**

```sql
select string_agg(code, chr(10) order by code) as 全部密码 from public.drama_codes;
```

**追加 10 个新密码**（会直接返回新密码）

```sql
insert into public.drama_codes(code)
select c.code from (
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32)::int+1, 1),'') as code
    from generate_series(1,10) as g(i) cross join generate_series(1,8) as d(j) group by g.i
) c on conflict (code) do nothing returning code;
```

**给某个密码加次数 / 标记卖给了谁**

```sql
update public.drama_codes set max_uses = max_uses + 3 where code = 'XXXXXXXX';
update public.drama_codes set note = '小红书-11月第3单' where code = 'XXXXXXXX';
```

---

## 规则说明

- **一次兑换 = 一次额度**。输入密码时扣 1 次，并开一个 6 小时有效的会话；期间刷新页面不会重复扣。
- **提交结果后额度用掉**。「再测一次」会再扣 1 次，扣到 0 就要求换新密码。
- **分享页不需要密码**。`?r=xxxx` 打开的是只读结果页，朋友能看到剧本卡，底部有「我也要测一次」引导回凭证页。
- **长图导出**在浏览器本地完成（html2canvas），不上传服务器。手机上长按图片存相册，电脑上点按钮下载。

---

## 已知限制

- **Supabase 免费项目 7 天没有任何请求会被自动暂停**（pause）。恢复需要登录控制台点一下 Restore，期间站点会报错。如果长期有人买，建议升级到 Pro（$25/月）或在后台定期访问一次。
- 分享链接里的短码是随机 10 位，不可枚举，但内容对拿到链接的人完全公开——这是分享功能的前提。
- GitHub Pages 免费版要求仓库 **public**，所以任何写进代码的密钥和密码都会公开。这也是 `schema.sql` 里密码改为随机生成、而不是写死清单的原因。

---

## 本地预览

```bash
# 直接双击 index.html 就能用（已接上真实数据库）
npx serve .     # 或者起一个本地服务器，行为更贴近线上
```

**自检数据库**（不消耗任何密码，只验证连通性与权限）：

```bash
npm i                                  # 装 supabase-js，仅脚本需要
node tools/live-test.mjs               # 连通性 + RLS 是否生效
node tools/e2e.mjs <密码> [剧本键]      # 全链路回归，会消耗 1 次机会
```

**直接对线上库执行 SQL**（避免中文剪贴板把 `--` 改成 `–`）：

```bash
# 先去 supabase.com/dashboard/account/tokens 生成 sbp_ 开头的 token
export SB_TOKEN=sbp_xxx
node tools/sql.mjs "select count(*) from public.drama_codes"
node tools/sql.mjs --file supabase/schema.sql
```

> 两个补丁 `fix-01` / `fix-02` 的修复内容已合并进 `schema.sql`，**新建项目只需跑 `schema.sql` 一份**。

如果 `config.js` 里没填值，页面会停在「站点还没有接上数据库」的提示上，这是预期行为。
