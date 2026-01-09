-- Create App Notices Table
create table if not exists app_notices (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text, -- Can contain HTML
  type text default 'notice', -- 'notice', 'event', 'emergency'
  is_active boolean default true,
  priority int default 0, -- 0: Normal, 1: High (Display on top or different color)
  author_id text references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Hidden Notices Table (Per User)
create table if not exists user_hidden_notices (
  user_id text references users(id) on delete cascade,
  notice_id uuid references app_notices(id) on delete cascade,
  hidden_at timestamptz default now(),
  primary key (user_id, notice_id)
);

-- RLS Policies
alter table app_notices enable row level security;
alter table user_hidden_notices enable row level security;

-- App Notices Policies
create policy "Public can view active notices" on app_notices
  for select using (is_active = true);

create policy "Admins can manage notices" on app_notices
  for all using (
    exists (select 1 from users where users.id = auth.uid()::text and users.role = 'admin')
  );

-- Hidden Notices Policies
create policy "Users can view own hidden entries" on user_hidden_notices
  for select using (auth.uid()::text = user_id);

create policy "Users can insert own hidden entries" on user_hidden_notices
  for insert with check (auth.uid()::text = user_id);

-- Add to NotificationType enum if not exists (conceptual update only, TypeScript handles enum)
-- No SQL change needed for TS Enum logic unless we store logic in DB constraints.

-- Initial Welcome Notice
insert into app_notices (title, content, type, priority, is_active)
values (
  '대똥단결에 오신 것을 환영합니다! 🎉',
  '<p>안녕하세요, <strong>대똥단결</strong>입니다.</p><p>쾌적한 화장실 공유 문화를 위해 함께해 주셔서 감사합니다.</p><p>지금 바로 주변 화장실을 찾아보세요!</p>',
  'notice',
  1,
  true
);
