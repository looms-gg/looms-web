-- garments.thumb_url points at a pre-baked PNG in the public garments bucket.
-- The client composes the URL itself, so a hand-crafted request could point a
-- piece's thumbnail at arbitrary content on any host, or at another maker's
-- folder. Postgres enforces the exact expected shape instead of trusting the
-- client: owner's folder, this piece's id, .thumb.png, optionally with a ?v=
-- cache-buster. A texture swap also nulls thumb_url so the stale baked art is
-- never shown while the new texture has not been re-baked yet.
--
-- The host is the project's Supabase URL (public info, derived from
-- VITE_SUPABASE_URL in the client env); it is hardcoded here because Postgres
-- cannot read the browser env.

create or replace function public.enforce_garment_thumb_url()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected text;
begin
  -- Null is legal: publish-before-bake, the client falls back to live
  -- rendering until the thumbnail exists.
  if new.thumb_url is null then
    return new;
  end if;

  -- A texture swap invalidates the old baked thumbnail; nulling forces the
  -- maker's client to re-bake, and a hand-crafted swap cannot keep showing
  -- the old art.
  if tg_op = 'UPDATE' and new.texture_url is distinct from old.texture_url then
    new.thumb_url := null;
    return new;
  end if;

  v_expected := 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
    || new.user_id || '/' || new.id || '.thumb.png';

  if new.thumb_url <> v_expected
     and left(new.thumb_url, length(v_expected) + 1) <> v_expected || '?' then
    raise exception 'Invalid thumbnail URL: it must point at this piece''s own image in your storage folder. Re-publish the piece to fix it.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_garment_thumb_url() from public, anon, authenticated;

drop trigger if exists trg_garments_enforce_thumb_url on public.garments;
create trigger trg_garments_enforce_thumb_url
  before insert or update on public.garments
  for each row execute function public.enforce_garment_thumb_url();
