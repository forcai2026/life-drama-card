/* ============================================================
   人生剧本卡 · 管理员后台 数据库脚本
   用法：Supabase 控制台 → SQL Editor → New query
        把本文件全部内容粘贴进去 → Run（只跑一次）
   说明：可重复执行，不会覆盖已有密码、不会清空数据

   首次登录密码：Drama@2026Admin
   登录后请立刻在后台右上角「改密码」里换掉它
   ============================================================ */

create extension if not exists pgcrypto with schema extensions;

/* ---------- 1. 管理员账户表（只有一行） ---------- */
create table if not exists public.drama_admins (
  id           uuid primary key default gen_random_uuid(),
  username     text unique not null default 'admin',
  pwd_hash     text not null,
  fail_count   int  not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now()
);

/* ---------- 2. 管理员登录会话 ---------- */
create table if not exists public.drama_admin_sessions (
  token      text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);

alter table public.drama_admins         enable row level security;
alter table public.drama_admin_sessions enable row level security;

/* ---------- 3. 内部工具：校验会话是否有效 ---------- */
create or replace function public._admin_ok(p_token text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $fn$
  select exists (
    select 1 from public.drama_admin_sessions
     where token = p_token
       and expires_at > now()
  );
$fn$;

/* ---------- 4. 登录 ---------- */
create or replace function public.admin_login(p_pwd text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  a       public.drama_admins;
  v_token text;
begin
  if p_pwd is null or length(trim(p_pwd)) = 0 then
    return jsonb_build_object('ok', false, 'msg', '请输入管理员密码');
  end if;

  select * into a from public.drama_admins where username = 'admin' for update;
  if not found then
    return jsonb_build_object('ok', false, 'msg', '管理员账户未初始化，请先执行 admin.sql');
  end if;

  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object(
      'ok',  false,
      'msg', '尝试次数过多，请 ' ||
             ceil(extract(epoch from (a.locked_until - now())) / 60)::int ||
             ' 分钟后再试'
    );
  end if;

  if a.pwd_hash = crypt(p_pwd, a.pwd_hash) then
    update public.drama_admins
       set fail_count = 0, locked_until = null
     where id = a.id;

    delete from public.drama_admin_sessions where expires_at < now();

    v_token := encode(gen_random_bytes(24), 'hex');
    insert into public.drama_admin_sessions(token) values (v_token);

    return jsonb_build_object('ok', true, 'token', v_token);
  else
    update public.drama_admins
       set fail_count   = fail_count + 1,
           locked_until = case
                            when fail_count + 1 >= 5 then now() + interval '5 minutes'
                            else locked_until
                          end
     where id = a.id;

    return jsonb_build_object('ok', false, 'msg', '密码错误');
  end if;
end;
$fn$;

/* ---------- 5. 退出登录 ---------- */
create or replace function public.admin_logout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
begin
  delete from public.drama_admin_sessions where token = p_token;
  return jsonb_build_object('ok', true);
end;
$fn$;

/* ---------- 6. 批量生成密码 ---------- */
create or replace function public.admin_gen_codes(
  p_token text,
  p_count int,
  p_uses  int
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_count int := least(greatest(coalesce(p_count, 10), 1), 200);
  v_uses  int := least(greatest(coalesce(p_uses, 3), 1), 99);
  v_code  text;
  v_out   jsonb := '[]'::jsonb;
  i       int;
  j       int;
  v_try   int;
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  for i in 1..v_count loop
    v_try := 0;
    loop
      v_code := '';
      for j in 1..8 loop
        v_code := v_code || substr(
          'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
          floor(random() * 32)::int + 1, 1
        );
      end loop;
      exit when not exists (select 1 from public.drama_codes where code = v_code);
      v_try := v_try + 1;
      exit when v_try > 30;
    end loop;

    insert into public.drama_codes(code, max_uses)
    values (v_code, v_uses)
    on conflict (code) do nothing;

    if found then
      v_out := v_out || to_jsonb(v_code);
    end if;
  end loop;

  return jsonb_build_object(
    'ok',    true,
    'codes', v_out,
    'count', jsonb_array_length(v_out),
    'uses',  v_uses
  );
end;
$fn$;

/* ---------- 7. 列表（含使用情况） ---------- */
create or replace function public.admin_list_codes(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_rows jsonb;
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'code',         c.code,
               'max',          c.max_uses,
               'used',         c.used,
               'note',         c.note,
               'created_at',   c.created_at,
               'last_used_at', c.last_used_at
             )
             order by c.created_at desc, c.code
           ),
           '[]'::jsonb
         )
    into v_rows
    from public.drama_codes c;

  return jsonb_build_object('ok', true, 'codes', v_rows);
end;
$fn$;

/* ---------- 8. 总览统计 ---------- */
create or replace function public.admin_stats(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v jsonb;
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  select jsonb_build_object(
           'codes',     count(*),
           'total',     coalesce(sum(max_uses), 0),
           'used',      coalesce(sum(used), 0),
           'remaining', coalesce(sum(max_uses - used), 0),
           'exhausted', count(*) filter (where used >= max_uses),
           'results',   (select count(*) from public.drama_results)
         )
    into v
    from public.drama_codes;

  return jsonb_build_object('ok', true, 'stats', v);
end;
$fn$;

/* ---------- 9. 改备注 ---------- */
create or replace function public.admin_set_note(
  p_token text,
  p_code  text,
  p_note  text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  update public.drama_codes
     set note = nullif(trim(coalesce(p_note, '')), '')
   where code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('ok', false, 'msg', '没有这个密码');
  end if;

  return jsonb_build_object('ok', true);
end;
$fn$;

/* ---------- 10. 加/减可用次数 ---------- */
create or replace function public.admin_bump_uses(
  p_token text,
  p_code  text,
  p_delta int
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_new int;
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  update public.drama_codes
     set max_uses = greatest(used, max_uses + coalesce(p_delta, 0))
   where code = upper(trim(p_code))
  returning max_uses into v_new;

  if v_new is null then
    return jsonb_build_object('ok', false, 'msg', '没有这个密码');
  end if;

  return jsonb_build_object('ok', true, 'max', v_new);
end;
$fn$;

/* ---------- 11. 删除密码 ---------- */
create or replace function public.admin_delete_code(
  p_token text,
  p_code  text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  delete from public.drama_codes where code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('ok', false, 'msg', '没有这个密码');
  end if;

  return jsonb_build_object('ok', true);
end;
$fn$;

/* ---------- 12. 修改管理员密码 ---------- */
create or replace function public.admin_change_pwd(
  p_token text,
  p_old   text,
  p_new   text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  a public.drama_admins;
begin
  if not public._admin_ok(p_token) then
    return jsonb_build_object('ok', false, 'msg', '登录已过期，请重新登录');
  end if;

  if p_new is null or length(trim(p_new)) < 8 then
    return jsonb_build_object('ok', false, 'msg', '新密码至少 8 位');
  end if;

  select * into a from public.drama_admins where username = 'admin' for update;
  if a.pwd_hash <> crypt(p_old, a.pwd_hash) then
    return jsonb_build_object('ok', false, 'msg', '原密码不对');
  end if;

  update public.drama_admins
     set pwd_hash = crypt(p_new, gen_salt('bf'))
   where id = a.id;

  delete from public.drama_admin_sessions;

  return jsonb_build_object('ok', true, 'msg', '密码已修改，所有设备需重新登录');
end;
$fn$;

/* ---------- 13. 权限：只开放后台需要的函数 ---------- */
revoke all on function public._admin_ok(text) from public;
revoke all on function public.admin_login(text) from public;
revoke all on function public.admin_logout(text) from public;
revoke all on function public.admin_gen_codes(text, int, int) from public;
revoke all on function public.admin_list_codes(text) from public;
revoke all on function public.admin_stats(text) from public;
revoke all on function public.admin_set_note(text, text, text) from public;
revoke all on function public.admin_bump_uses(text, text, int) from public;
revoke all on function public.admin_delete_code(text, text) from public;
revoke all on function public.admin_change_pwd(text, text, text) from public;

grant execute on function public.admin_login(text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
grant execute on function public.admin_gen_codes(text, int, int) to anon, authenticated;
grant execute on function public.admin_list_codes(text) to anon, authenticated;
grant execute on function public.admin_stats(text) to anon, authenticated;
grant execute on function public.admin_set_note(text, text, text) to anon, authenticated;
grant execute on function public.admin_bump_uses(text, text, int) to anon, authenticated;
grant execute on function public.admin_delete_code(text, text) to anon, authenticated;
grant execute on function public.admin_change_pwd(text, text, text) to anon, authenticated;

/* ---------- 14. 初始化管理员密码 ---------- */
/* 密码 Drama@2026Admin，只在账户表为空时写入一次 */
do $do$
begin
  if not exists (select 1 from public.drama_admins) then
    insert into public.drama_admins(username, pwd_hash)
    values ('admin', crypt('Drama@2026Admin', gen_salt('bf')));
    raise notice '管理员账户已创建，初始密码：Drama@2026Admin';
  else
    raise notice '管理员账户已存在，密码保持不变';
  end if;
end;
$do$;

/* 执行完应看到：Success. No rows returned */
