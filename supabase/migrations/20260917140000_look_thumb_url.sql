-- Look thumbnails: when a look is saved or overwritten the client bakes the
-- iso render and uploads it into the public garments bucket next to the
-- owner's textures, mirroring garment thumbs. thumb_url must point at that
-- exact object; Postgres enforces the shape instead of trusting the client.
alter table public.looks add column if not exists thumb_url text;

-- ---------------------------------------------------------------------------
-- Owner-scoped thumb_url guard for looks (mirrors garments.thumb_url guard).
-- The client composes the URL itself, so a hand-crafted request could point a
-- look's thumbnail at arbitrary content on any host, or at another maker's
-- folder. Postgres enforces the exact expected shape: owner's folder, this
-- look's id, .thumb.png, optionally with a ?v= cache-buster. A stack, body,
-- hue, or model change also nulls thumb_url so stale baked art is never shown
-- while the new outfit has not been re-baked yet.
--
-- The host is the project's Supabase URL (public info, derived from
-- VITE_SUPABASE_URL in the client env); it is hardcoded here because Postgres
-- cannot read the browser env.

create or replace function public.enforce_look_thumb_url()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected text;
begin
  -- Null is legal: save-before-bake, embeds fall back to the shared image
  -- until the thumbnail exists.
  if new.thumb_url is null then
    return new;
  end if;

  -- A gameplay change invalidates the old baked thumbnail; nulling forces the
  -- maker's client to re-bake, and a hand-crafted edit cannot keep showing
  -- the old art.
  if tg_op = 'UPDATE' and (
       new.stack is distinct from old.stack
       or new.body_id is distinct from old.body_id
       or new.body_hue is distinct from old.body_hue
       or new.model is distinct from old.model
  ) then
    new.thumb_url := null;
    return new;
  end if;

  v_expected := 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
    || new.user_id || '/' || new.id || '.thumb.png';

  if new.thumb_url <> v_expected
     and left(new.thumb_url, length(v_expected) + 1) <> v_expected || '?' then
    raise exception 'Invalid thumbnail URL: it must point at this look''s own image in your storage folder. Re-save the look to fix it.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_look_thumb_url() from public, anon, authenticated;

drop trigger if exists trg_looks_enforce_thumb_url on public.looks;
create trigger trg_looks_enforce_thumb_url
  before insert or update on public.looks
  for each row execute function public.enforce_look_thumb_url();
