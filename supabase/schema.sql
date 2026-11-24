-- ============================================================
--  人生剧本卡 · 数据库初始化脚本
--  用法：Supabase 控制台 → 左侧 SQL Editor → New query
--        把本文件全部内容粘贴进去 → 点 Run（只跑一次）
--  说明：本脚本可重复执行，不会重复插入密码、不会清空已有数据
-- ============================================================

-- Supabase 把扩展装在 extensions schema，函数里必须一起放进 search_path，
-- 否则 security definer + set search_path = public 会导致 gen_random_bytes 找不到
create extension if not exists pgcrypto with schema extensions;

-- ---------- 1. 凭证密码表 ----------
create table if not exists public.drama_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,          -- 大写字母+数字，8 位
  max_uses     int  not null default 3,       -- 每个密码可用次数
  used         int  not null default 0,
  note         text,                          -- 备注（比如卖给谁了）
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- ---------- 2. 会话表（兑换一次 = 开一个会话） ----------
create table if not exists public.drama_sessions (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null,            -- 前端 localStorage 里存的凭证
  code_id    uuid references public.drama_codes(id) on delete cascade,
  status     text not null default 'open',    -- open 未完成 / used 已出结果
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

-- ---------- 3. 结果表（分享用） ----------
create table if not exists public.drama_results (
  id         uuid primary key default gen_random_uuid(),
  share_id   text unique not null,            -- 分享链接里的短码
  play_key   text not null,                   -- 剧本原型 key
  age        int,
  score      numeric,
  dims       jsonb,                           -- 五维原始得分，用于复查
  session_id uuid references public.drama_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_drama_results_share on public.drama_results(share_id);
create index if not exists idx_drama_sessions_token on public.drama_sessions(token);
create index if not exists idx_drama_codes_code on public.drama_codes(code);

-- ---------- 4. 开启行级安全：前端拿不到任何表 ----------
-- 不创建任何 policy = anon 角色无法直接 select/insert/update
-- 所有读写必须走下面三个 security definer 函数
alter table public.drama_codes    enable row level security;
alter table public.drama_sessions enable row level security;
alter table public.drama_results  enable row level security;

-- ---------- 5. 兑换凭证：校验 + 扣次数 + 发会话 ----------
create or replace function public.redeem_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  r       public.drama_codes;
  v_token text;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('ok', false, 'msg', '请输入凭证密码');
  end if;

  select * into r
    from public.drama_codes
   where code = upper(trim(p_code))
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'msg', '没有这个密码，检查一下有没有输错');
  end if;

  if r.used >= r.max_uses then
    return jsonb_build_object('ok', false, 'msg', '这个密码的 ' || r.max_uses || ' 次机会已经用完了');
  end if;

  update public.drama_codes
     set used = used + 1,
         last_used_at = now()
   where id = r.id;

  v_token := encode(gen_random_bytes(18), 'hex');

  insert into public.drama_sessions(token, code_id)
  values (v_token, r.id);

  return jsonb_build_object(
    'ok',        true,
    'token',     v_token,
    'remaining', r.max_uses - r.used - 1,
    'max',       r.max_uses
  );
end;
$fn$;

-- ---------- 6. 提交结果：换取分享码 ----------
create or replace function public.submit_result(
  p_token text,
  p_play  text,
  p_age   int,
  p_score numeric,
  p_dims  jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  s       public.drama_sessions;
  v_share text;
  v_try   int := 0;
begin
  -- 剧本键白名单：与前端 PLAYS 的 8 个键保持一致，
  -- 否则会写进前端渲染不出来的分享链接
  if p_play is null or p_play not in (
       'chengxi','dongshi','kuqing','danvzhu',
       'qingxing','xiju','jiushu','choubei') then
    return jsonb_build_object('ok', false, 'msg', '结果数据不完整，请重新测试');
  end if;

  select * into s
    from public.drama_sessions
   where token = p_token
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'msg', '会话不存在，请重新输入密码');
  end if;
  if s.status <> 'open' then
    return jsonb_build_object('ok', false, 'msg', '这一次的结果已经提交过了');
  end if;
  if s.expires_at < now() then
    return jsonb_build_object('ok', false, 'msg', '这次机会已过期，请重新输入密码');
  end if;

  loop
    v_share := lower(substring(md5(random()::text || clock_timestamp()::text), 1, 10));
    exit when not exists (select 1 from public.drama_results where share_id = v_share);
    v_try := v_try + 1;
    if v_try > 5 then
      v_share := lower(substring(md5(random()::text), 1, 14));
      exit;
    end if;
  end loop;

  insert into public.drama_results(share_id, play_key, age, score, dims, session_id)
  values (
    v_share, p_play,
    least(greatest(coalesce(p_age, 28), 1), 120),
    least(greatest(coalesce(p_score, 0), 0), 10),
    coalesce(p_dims, '{}'::jsonb), s.id
  );

  update public.drama_sessions set status = 'used' where id = s.id;

  return jsonb_build_object('ok', true, 'share', v_share);
end;
$fn$;

-- ---------- 7. 读取分享结果 ----------
create or replace function public.get_result(p_share text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  r public.drama_results;
begin
  select * into r
    from public.drama_results
   where share_id = lower(trim(p_share));

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok',         true,
    'play',       r.play_key,
    'age',        r.age,
    'score',      r.score,
    'dims',       r.dims,
    'created_at', r.created_at
  );
end;
$fn$;

-- ---------- 8. 只把这些函数开放给匿名前端 ----------
revoke all on function public.redeem_code(text) from public;
revoke all on function public.submit_result(text, text, int, numeric, jsonb) from public;
revoke all on function public.get_result(text) from public;

grant execute on function public.redeem_code(text) to anon, authenticated;
grant execute on function public.submit_result(text, text, int, numeric, jsonb) to anon, authenticated;
grant execute on function public.get_result(text) to anon, authenticated;

-- ---------- 9. 生成 30 个凭证（每个 3 次） ----------
-- 密码在这里随机生成，不写死在文件里 —— 因为本站点是公开仓库托管的，
-- 写进代码的密码等于公开的密码。
-- 执行后会直接返回 30 个密码，请立刻复制保存（这是唯一一次显示）。
-- 想改数量，把下面的 30 改成你要的数字即可。
insert into public.drama_codes (code, max_uses)
select c.code, 3
from (
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                  floor(random() * 32)::int + 1, 1), ''
         ) as code
    from generate_series(1, 30) as g(i)
   cross join generate_series(1, 8) as d(j)
   group by g.i
) c
on conflict (code) do nothing
returning code;

-- ============================================================
--  常用管理语句（需要时单独选中执行）
-- ------------------------------------------------------------
--  查看所有密码与剩余次数：
--  select code, used || '/' || max_uses as 已用, max_uses-used as 剩余, last_used_at
--    from public.drama_codes order by created_at;
--
--  某个密码卖给了谁（备注）：
--  update public.drama_codes set note='小红书-10月第3单' where code='XXXXXXXX';
--
--  追加新密码（一次 10 个，执行后会返回新密码）：
--  insert into public.drama_codes(code)
--  select c.code from (
--    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32)::int+1, 1),'') as code
--      from generate_series(1,10) as g(i) cross join generate_series(1,8) as d(j) group by g.i
--  ) c on conflict (code) do nothing returning code;
--
--  给某个密码加次数：
--  update public.drama_codes set max_uses = max_uses + 3 where code='XXXXXXXX';
--
--  查看最近 20 条结果：
--  select share_id, play_key, age, score, created_at
--    from public.drama_results order by created_at desc limit 20;
-- ============================================================
