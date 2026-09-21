-- ============================================================
-- STYLE DIARY · Supabase 数据库初始化脚本
--
-- 用法：
--   1. 打开 Supabase 控制台 → 左侧 SQL Editor → New query
--   2. 把本文件全部内容粘贴进去
--   3. 点 Run（右下角）
--   4. 看到 "Success. No rows returned" 即为成功
--
-- 说明：本脚本可安全重复执行（用了 create ... if not exists / drop policy if exists）
-- ============================================================


-- ------------------------------------------------------------
-- 1. 衣橱单品
-- ------------------------------------------------------------
create table if not exists public.clothing (
  id                 text primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  category           text not null check (category in ('top', 'bottom', 'shoe', 'accessory')),
  accessory_position text check (accessory_position in ('upper', 'lower')),
  image_url          text not null,
  created_at         timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. 搭配记录（含合成长图）
-- ------------------------------------------------------------
create table if not exists public.outfits (
  id                 text primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  top_id             text,
  bottom_id          text,
  shoe_id            text,
  accessory_upper_id text,
  accessory_lower_id text,
  composite_image_url text,
  created_at         timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 3. 灵感墙
-- ------------------------------------------------------------
create table if not exists public.inspirations (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  image_url  text not null,
  note       text not null default '',
  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 4. 索引（按用户 + 时间倒序查询，正是前端列表的读取方式）
-- ------------------------------------------------------------
create index if not exists clothing_user_created_idx
  on public.clothing (user_id, created_at desc);
create index if not exists outfits_user_created_idx
  on public.outfits (user_id, created_at desc);
create index if not exists inspirations_user_created_idx
  on public.inspirations (user_id, created_at desc);


-- ------------------------------------------------------------
-- 5. 行级安全策略（RLS）
--    这是"数据安全"的核心：即使 anon key 公开，
--    任何人登录后也只能读写 user_id 等于自己的那些行。
-- ------------------------------------------------------------
alter table public.clothing     enable row level security;
alter table public.outfits      enable row level security;
alter table public.inspirations enable row level security;

drop policy if exists "clothing_own" on public.clothing;
create policy "clothing_own" on public.clothing
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "outfits_own" on public.outfits;
create policy "outfits_own" on public.outfits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "inspirations_own" on public.inspirations;
create policy "inspirations_own" on public.inspirations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 6. 图片存储桶
--    路径约定：{user_id}/{随机文件名}.jpg
--    写入策略限制了每个用户只能上传到自己 user_id 目录下。
--    （桶为 public，图片通过公开 URL 直接显示，文件名含随机串不可猜测）
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('style-diary', 'style-diary', true)
on conflict (id) do nothing;

-- 桶级护栏：单文件最大 5MB，且只接受图片类型。
-- 采用"开放注册"（谁能拿到网址谁就能建账号）时，这道限制可以防止有人
-- 用注册来的账号往桶里灌大文件或非图片内容，把你的免费存储额度（1GB）耗尽。
-- 本项目上传前会把图片压到长边 1600px 的 JPEG（通常 200~400KB），5MB 绰绰有余。
update storage.buckets
   set file_size_limit = 5242880, -- 5MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'style-diary';

drop policy if exists "style_diary_images_insert" on storage.objects;
create policy "style_diary_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'style-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 读取策略：Storage 的 delete / move 操作除了 delete / update 权限之外，
-- 还需要能 select 到目标对象本身（API 内部会先查一次元数据再动手）。
-- 少了这条，"删除记录后清理云端图片"会静默失败：API 返回 200 + 空数组
-- （一个对象都没删）、也不报错，界面上完全看不出异常，只会留下孤儿图片。
-- 因此这一条务必保留。
drop policy if exists "style_diary_images_select" on storage.objects;
create policy "style_diary_images_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'style-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "style_diary_images_update" on storage.objects;
create policy "style_diary_images_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'style-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "style_diary_images_delete" on storage.objects;
create policy "style_diary_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'style-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
