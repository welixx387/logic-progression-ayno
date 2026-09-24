-- Logic progression ayno — аккаунты и синхронизация прогресса.
--
-- Как применить:
--   1. Откройте проект на supabase.com → SQL Editor → New query.
--   2. Вставьте этот файл целиком и нажмите Run.
-- Скрипт можно запускать повторно. Если у вас уже есть проект для
-- White Room Progress, используйте его: таблица здесь отдельная,
-- а аккаунт у пользователя будет один на оба сайта.

create table if not exists public.logic_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Каждый видит и меняет только свою строку.
alter table public.logic_progress enable row level security;

drop policy if exists "Own progress: read" on public.logic_progress;
create policy "Own progress: read"
  on public.logic_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Own progress: insert" on public.logic_progress;
create policy "Own progress: insert"
  on public.logic_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Own progress: update" on public.logic_progress;
create policy "Own progress: update"
  on public.logic_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Own progress: delete" on public.logic_progress;
create policy "Own progress: delete"
  on public.logic_progress for delete
  using (auth.uid() = user_id);

-- Realtime: решённое на телефоне сразу появляется на компьютере.
do $$
begin
  alter publication supabase_realtime add table public.logic_progress;
exception
  when duplicate_object then null;
end $$;
