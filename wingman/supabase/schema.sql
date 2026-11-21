-- =====================================================================
-- Wingman — Supabase schema (Postgres + Row Level Security)
-- Run once in: Supabase Dashboard → SQL Editor → New query → Run.
-- Intended for a fresh project. It does not seed any data.
-- =====================================================================

-- ---------- Tables ---------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 40),
  handle          text not null check (handle ~ '^[a-z0-9]{3,20}$'),
  bio             text not null default '' check (char_length(bio) <= 160),
  notifs_seen_at  timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create unique index profiles_handle_key on public.profiles (handle);

create table public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references public.profiles(id) on delete cascade,
  to_id       uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted')),
  created_at  timestamptz not null default now(),
  check (from_id <> to_id)
);
-- One relationship per pair, regardless of direction (blocks duplicate / crossed requests)
create unique index friend_requests_pair_key
  on public.friend_requests (least(from_id, to_id), greatest(from_id, to_id));
create index friend_requests_to_idx on public.friend_requests (to_id);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 90),
  body        text not null check (char_length(btrim(body)) between 1 and 5000),
  cat         text not null default 'Other'
              check (cat in ('Party','Date','Friendship','Support','Work','Other')),
  helped_id   uuid references public.profiles(id) on delete set null,
  tags        uuid[] not null default '{}' check (cardinality(tags) <= 20),
  created_at  timestamptz not null default now()
);
create index posts_user_idx on public.posts (user_id, created_at desc);

-- v = the 8 category scores (1–10), in the order the app shows them:
-- Confidence, Conversation skills, Social awareness, Humor,
-- Supportiveness, Creativity, Teamwork, Overall performance
create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  v           smallint[] not null
              check (cardinality(v) = 8 and v <@ array[1,2,3,4,5,6,7,8,9,10]::smallint[]),
  note        text not null default '' check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (post_id, user_id)            -- one rating per person per report
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 400),
  created_at  timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.comment_likes (
  comment_id  uuid not null references public.comments(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);

create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null check (emoji in ('Legend','Funny','Respect')),
  unique (post_id, user_id)            -- one reaction per person per report
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  to_id       uuid not null references public.profiles(id) on delete cascade,
  from_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('req','ok','post','rate','comment','reply')),
  post_id     uuid references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index notifications_to_idx on public.notifications (to_id, created_at desc);

-- Reviews of the Wingman service itself (the public landing / reviews page).
create table public.site_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 40),
  score       smallint not null check (score between 1 and 10),
  cats        jsonb not null default '{}'::jsonb
              check (jsonb_typeof(cats) = 'object' and length(cats::text) <= 300),
  tags        text[] not null default '{}' check (cardinality(tags) <= 10),
  comment     text not null default '' check (char_length(comment) <= 600),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Helper functions (used by RLS policies) -------------------

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friend_requests
    where status = 'accepted'
      and ((from_id = a and to_id = b) or (from_id = b and to_id = a))
  );
$$;

-- A post is visible to its author and the author's accepted friends.
create or replace function public.can_see_post(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p
    where p.id = pid
      and (p.user_id = auth.uid() or public.are_friends(auth.uid(), p.user_id))
  );
$$;

-- You may rate a post only if it is not yours and you are the author's friend.
create or replace function public.can_rate_post(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p
    where p.id = pid
      and p.user_id <> auth.uid()
      and public.are_friends(auth.uid(), p.user_id)
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon;
revoke all on function public.can_see_post(uuid)      from public, anon;
revoke all on function public.can_rate_post(uuid)     from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.can_see_post(uuid)      to authenticated;
grant execute on function public.can_rate_post(uuid)     to authenticated;

-- ---------- Guard triggers -------------------------------------------

create or replace function public.ratings_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.posts p where p.id = new.post_id and p.user_id = new.user_id) then
    raise exception 'You cannot rate your own report' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.post_id <> old.post_id or new.user_id <> old.user_id then
      raise exception 'post_id and user_id cannot be changed' using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger ratings_guard_trg before insert or update on public.ratings
  for each row execute function public.ratings_guard();

create or replace function public.comments_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments c
    where c.id = new.parent_id and c.post_id = new.post_id and c.parent_id is null
  ) then
    raise exception 'Invalid parent comment' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger comments_guard_trg before insert on public.comments
  for each row execute function public.comments_guard();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger site_reviews_touch before update on public.site_reviews
  for each row execute function public.touch_updated_at();

-- ---------- Notification triggers (server-side, cannot be forged) -----

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(to_id, from_id, kind) values (new.to_id, new.from_id, 'req');
  elsif old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications(to_id, from_id, kind) values (new.from_id, new.to_id, 'ok');
  end if;
  return new;
end $$;
create trigger friend_requests_notify after insert or update on public.friend_requests
  for each row execute function public.notify_friend_request();

create or replace function public.notify_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(to_id, from_id, kind, post_id)
  select case when fr.from_id = new.user_id then fr.to_id else fr.from_id end,
         new.user_id, 'post', new.id
  from public.friend_requests fr
  where fr.status = 'accepted' and (fr.from_id = new.user_id or fr.to_id = new.user_id);
  return new;
end $$;
create trigger posts_notify after insert on public.posts
  for each row execute function public.notify_post();

create or replace function public.notify_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(to_id, from_id, kind, post_id)
  select p.user_id, new.user_id, 'rate', new.post_id from public.posts p where p.id = new.post_id;
  return new;
end $$;
create trigger ratings_notify after insert on public.ratings
  for each row execute function public.notify_rating();

create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_owner uuid; parent_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    insert into public.notifications(to_id, from_id, kind, post_id)
    values (post_owner, new.user_id, 'comment', new.post_id);
  end if;
  if new.parent_id is not null then
    select user_id into parent_owner from public.comments where id = new.parent_id;
    if parent_owner is not null and parent_owner <> new.user_id
       and parent_owner is distinct from post_owner then
      insert into public.notifications(to_id, from_id, kind, post_id)
      values (parent_owner, new.user_id, 'reply', new.post_id);
    end if;
  end if;
  return new;
end $$;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment();

-- ---------- Row Level Security ----------------------------------------

alter table public.profiles        enable row level security;
alter table public.friend_requests enable row level security;
alter table public.posts           enable row level security;
alter table public.ratings         enable row level security;
alter table public.comments        enable row level security;
alter table public.comment_likes   enable row level security;
alter table public.reactions       enable row level security;
alter table public.notifications   enable row level security;
alter table public.site_reviews    enable row level security;

-- profiles: any signed-in user can search/see profiles (Find Friends);
-- you can create and edit only your own. The handle can never be changed.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (name, bio, notifs_seen_at) on public.profiles to authenticated;

-- friend_requests: only the two people involved can see them.
create policy fr_select on public.friend_requests for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy fr_insert on public.friend_requests for insert to authenticated
  with check (from_id = auth.uid() and status = 'pending');
create policy fr_accept on public.friend_requests for update to authenticated
  using (to_id = auth.uid() and status = 'pending')
  with check (to_id = auth.uid() and status = 'accepted');
revoke update on public.friend_requests from authenticated;
grant  update (status) on public.friend_requests to authenticated;
create policy fr_delete on public.friend_requests for delete to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- posts: author + friends can read; only the author writes.
create policy posts_select on public.posts for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));
create policy posts_insert on public.posts for insert to authenticated
  with check (user_id = auth.uid()
              and (helped_id is null or public.are_friends(auth.uid(), helped_id)));
create policy posts_delete on public.posts for delete to authenticated
  using (user_id = auth.uid());

-- ratings: visible where the post is visible; only friends (not the author) can rate, once.
create policy ratings_select on public.ratings for select to authenticated
  using (public.can_see_post(post_id));
create policy ratings_insert on public.ratings for insert to authenticated
  with check (user_id = auth.uid() and public.can_rate_post(post_id));
create policy ratings_update on public.ratings for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_rate_post(post_id));
create policy ratings_delete on public.ratings for delete to authenticated
  using (user_id = auth.uid());

-- comments
create policy comments_select on public.comments for select to authenticated
  using (public.can_see_post(post_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_post(post_id));
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid());

-- comment likes (visibility follows the comment's own RLS)
create policy cl_select on public.comment_likes for select to authenticated
  using (exists (select 1 from public.comments c where c.id = comment_id));
create policy cl_insert on public.comment_likes for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.comments c where c.id = comment_id));
create policy cl_delete on public.comment_likes for delete to authenticated
  using (user_id = auth.uid());

-- reactions
create policy rx_select on public.reactions for select to authenticated
  using (public.can_see_post(post_id));
create policy rx_insert on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_post(post_id));
create policy rx_update on public.reactions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_see_post(post_id));
create policy rx_delete on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- notifications: recipients read/clear their own; inserts happen only in triggers.
create policy notif_select on public.notifications for select to authenticated
  using (to_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated
  using (to_id = auth.uid());

-- site_reviews: each signed-in user manages only their own single review.
-- Everyone (including logged-out visitors) reads reviews through the view below.
create policy sr_select_own on public.site_reviews for select to authenticated
  using (user_id = auth.uid());
create policy sr_insert on public.site_reviews for insert to authenticated
  with check (user_id = auth.uid());
create policy sr_update on public.site_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sr_delete on public.site_reviews for delete to authenticated
  using (user_id = auth.uid());

-- ---------- Public view (no user ids exposed) -------------------------
-- Intentionally runs with the view owner's rights so anonymous visitors can read
-- reviews without being able to read the underlying table or see who wrote them.
create view public.public_reviews as
  select id, name, score, cats, tags, comment, created_at
  from public.site_reviews;

-- ---------- Table privileges ------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.public_reviews to anon, authenticated;

-- ---------- Realtime ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','friend_requests','posts','ratings','comments',
                           'comment_likes','reactions','notifications']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
