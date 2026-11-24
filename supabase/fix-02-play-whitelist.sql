-- ============================================================
--  修复 02：submit_result 增加 play 白名单与参数范围校验
--  背景：前端分享页只认 8 个剧本键，但数据库对 p_play 不做校验，
--        任何字符串都能入库，会生成永远打不开的分享链接。
--  用法：在 SQL Editor 里整段执行（可重复执行）
-- ============================================================

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
  -- 参数合法性：剧本键必须在白名单内，否则前端分享页无法渲染
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
    v_share,
    p_play,
    least(greatest(coalesce(p_age, 28), 1), 120),
    least(greatest(coalesce(p_score, 0), 0), 10),
    coalesce(p_dims, '{}'::jsonb),
    s.id
  );

  update public.drama_sessions set status = 'used' where id = s.id;

  return jsonb_build_object('ok', true, 'share', v_share);
end;
$fn$;
