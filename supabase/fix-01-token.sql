-- ============================================================
--  修复 01：兑换密码时报 function gen_random_bytes(integer) does not exist
--  原因：pgcrypto 装在 extensions schema，而函数里 set search_path = public
--  用法：Supabase → SQL Editor → 粘贴下面这一行 → Run
-- ============================================================

alter function public.redeem_code(text) set search_path = public, extensions;


-- ------------------------------------------------------------
--  如果上面那行执行后仍然报同样的错，改用下面这段（自动探测扩展所在 schema）
--  用法：整段选中执行
-- ------------------------------------------------------------
-- do $$
-- declare s text;
-- begin
--   select n.nspname into s
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where p.proname = 'gen_random_bytes' limit 1;
--   if s is null then
--     raise exception 'pgcrypto 没有安装，请先执行 create extension pgcrypto';
--   end if;
--   execute format('alter function public.redeem_code(text) set search_path = public, %I', s);
--   raise notice '已把 redeem_code 的搜索路径指向 %', s;
-- end $$;
