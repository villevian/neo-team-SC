-- =====================================================================
--  Degree or Certificate? (ENG HUB) — схема Supabase
--  Виконайте ВЕСЬ файл: Supabase → SQL Editor → New query → Run.
--  Пароль адмінки згенерується сам — його покаже результат запиту внизу.
--
--  Безпека: таблиці закриті (RLS без політик). Браузер працює лише через
--  функції нижче, тож студенти не можуть читати чужі відповіді, а повні
--  дані бачить тільки адмінка з паролем.
-- =====================================================================

create table if not exists public.students (
  client_id  text primary key,
  name       text not null,
  joined_at  timestamptz not null default now()
);

create table if not exists public.responses (
  client_id  text not null,
  name       text not null,
  activity   text not null check (activity in ('tot', 'budget', 'case', 'invest')),
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (client_id, activity, key)
);

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.students     enable row level security;
alter table public.responses    enable row level security;
alter table public.app_settings enable row level security;
-- Політик немає навмисно: прямий доступ anon/authenticated заборонено.
revoke all on public.students, public.responses, public.app_settings from anon, authenticated;

-- ---------- студент: вхід / зміна імені ----------
create or replace function public.join_student(p_client_id text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 60);
begin
  if coalesce(length(p_client_id), 0) not between 8 and 64 or length(v_name) < 1 then
    raise exception 'bad join';
  end if;
  insert into students (client_id, name) values (p_client_id, v_name)
    on conflict (client_id) do update set name = excluded.name;
  update responses set name = v_name where client_id = p_client_id;
end $$;

-- ---------- студент: зберегти відповідь (upsert) ----------
create or replace function public.save_response(p_client_id text, p_name text, p_activity text, p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 60);
begin
  if coalesce(length(p_client_id), 0) not between 8 and 64 or length(v_name) < 1
     or p_activity not in ('tot', 'budget', 'case', 'invest')
     or coalesce(length(p_key), 0) not between 1 and 20
     or coalesce(length(p_value), 0) > 1000 then
    raise exception 'bad save';
  end if;
  insert into students (client_id, name) values (p_client_id, v_name)
    on conflict (client_id) do nothing;
  insert into responses (client_id, name, activity, key, value, updated_at)
    values (p_client_id, v_name, p_activity, p_key, coalesce(p_value, ''), now())
    on conflict (client_id, activity, key)
    do update set name = excluded.name, value = excluded.value, updated_at = now();
end $$;

-- ---------- студенти: анонімний рейтинг Employability Budget (без імен) ----------
create or replace function public.budget_summary()
returns json language sql stable security definer set search_path = public as $$
  with valid as (
    select r.client_id, r.value::jsonb as a
    from responses r
    where r.activity = 'budget' and r.key = 'alloc'
      and r.value ~ '^\s*\{.*\}\s*$'
  ), checked as (
    select v.client_id, v.a from valid v
    where jsonb_typeof(v.a) = 'object'
      and (select bool_and(jsonb_typeof(e.value) = 'number' and (e.value)::text::numeric >= 0) from jsonb_each(v.a) e)
      and (select sum((e.value)::text::numeric) from jsonb_each(v.a) e) = 100
  ), per as (
    select e.key as asset, (e.value)::text::numeric as pts
    from checked c, jsonb_each(c.a) e
  )
  select json_build_object(
    'count', (select count(*) from checked),
    'assets', coalesce((
      select json_object_agg(s.asset, s.stats) from (
        select asset, json_build_object(
          'avg', round(avg(pts), 1), 'min', min(pts), 'max', max(pts),
          'sd', round(coalesce(stddev_pop(pts), 0), 1), 'n', count(*)) as stats
        from per group by asset
      ) s
    ), '{}'::json)
  );
$$;

-- ---------- адмінка: всі дані (потрібен пароль) ----------
create or replace function public.admin_results(p_key text)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if p_key is null or p_key is distinct from (select value from app_settings where key = 'admin_key') then
    raise exception 'wrong key';
  end if;
  return json_build_object(
    'students',  coalesce((select json_agg(json_build_object('clientId', client_id, 'name', name, 'joinedAt', joined_at) order by joined_at) from students), '[]'::json),
    'responses', coalesce((select json_agg(json_build_object('clientId', client_id, 'name', name, 'activity', activity, 'key', key, 'value', value, 'updatedAt', updated_at) order by updated_at) from responses), '[]'::json)
  );
end $$;

-- ---------- адмінка: очистити все перед новою групою ----------
create or replace function public.admin_reset(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or p_key is distinct from (select value from app_settings where key = 'admin_key') then
    raise exception 'wrong key';
  end if;
  delete from responses where true;
  delete from students where true;
end $$;

revoke all on function public.join_student(text, text), public.save_response(text, text, text, text, text),
  public.budget_summary(), public.admin_results(text), public.admin_reset(text) from public;
grant execute on function public.join_student(text, text), public.save_response(text, text, text, text, text),
  public.budget_summary(), public.admin_results(text), public.admin_reset(text) to anon, authenticated;

-- ---------- ПАРОЛЬ АДМІНКИ ----------
-- Генерується випадково під час першого запуску (повторний запуск його НЕ змінює).
-- Пароль покаже останній SELECT нижче у вкладці Results.
-- Хочете свій пароль: update public.app_settings set value = 'мій-пароль' where key = 'admin_key';
insert into public.app_settings (key, value)
  values ('admin_key', substr(md5(random()::text || clock_timestamp()::text), 1, 10))
  on conflict (key) do nothing;

select value as "Пароль адмінки (збережіть!)" from public.app_settings where key = 'admin_key';
