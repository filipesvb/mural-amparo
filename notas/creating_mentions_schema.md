-- estende o check de type para aceitar 'mention'
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'mention'));

-- menções em posts
create or replace function notify_post_mentions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m record;
  mentioned_id uuid;
begin
  for m in
    select distinct (regexp_matches(new.content, '@([A-Za-z0-9_]{2,30})', 'g'))[1] as nickname
  loop
    select id into mentioned_id from profiles where nickname = m.nickname;
    if mentioned_id is null then continue; end if;
    if mentioned_id = new.user_id then continue; end if;
    insert into notifications (recipient_id, actor_id, type, post_id)
    values (mentioned_id, new.user_id, 'mention', new.id);
  end loop;
  return new;
end $$;

create trigger posts_notify_mentions
after insert on posts
for each row execute function notify_post_mentions();

-- menções em comentários (dedup: dono do post já recebe notificação de 'comment')
create or replace function notify_comment_mentions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m record;
  mentioned_id uuid;
  post_owner uuid;
begin
  select user_id into post_owner from posts where id = new.post_id;
  for m in
    select distinct (regexp_matches(new.content, '@([A-Za-z0-9_]{2,30})', 'g'))[1] as nickname
  loop
    select id into mentioned_id from profiles where nickname = m.nickname;
    if mentioned_id is null then continue; end if;
    if mentioned_id = new.user_id then continue; end if;
    if mentioned_id = post_owner then continue; end if;
    insert into notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (mentioned_id, new.user_id, 'mention', new.post_id, new.id);
  end loop;
  return new;
end $$;

create trigger comments_notify_mentions
after insert on comments
for each row execute function notify_comment_mentions();
