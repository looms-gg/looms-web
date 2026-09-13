-- Destructive admin paths become SECURITY DEFINER RPCs so the is_admin()
-- gate, the mutation, and the audit row commit in one transaction — matching
-- the admin_set_moderation_state pattern. The client helpers in
-- src/lib/reports.ts and src/lib/siteBanner.ts become thin wrappers over
-- these, which removes the split brain where an audit failure (or a dropped
-- client) could leave a privileged action unaudited.

-- 1. Delete moderated content (looks, pieces, comments) -----------------------
create or replace function public.admin_delete_content(
  p_target_type text,
  p_target_id text,
  p_sub_type text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_delete_content: caller is not an admin'
      using errcode = '42501';
  end if;

  if p_target_type = 'look' then
    delete from public.looks where id::text = p_target_id;
    perform public.log_admin_action('delete_look', 'looks', p_target_id);
  elsif p_target_type = 'piece' then
    delete from public.garments where id::text = p_target_id;
    perform public.log_admin_action('delete_garment', 'garments', p_target_id);
  elsif p_target_type = 'comment' then
    if p_sub_type = 'look_comment' then
      delete from public.look_comments where id::text = p_target_id;
      perform public.log_admin_action('delete_look_comment', 'look_comments', p_target_id);
    elsif p_sub_type = 'garment_comment' then
      delete from public.garment_comments where id::text = p_target_id;
      perform public.log_admin_action('delete_garment_comment', 'garment_comments', p_target_id);
    else
      -- Older reports can arrive without a sub_type: try both comment tables
      -- and audit whichever actually held the row.
      v_deleted := false;
      if exists (select 1 from public.garment_comments where id::text = p_target_id) then
        delete from public.garment_comments where id::text = p_target_id;
        perform public.log_admin_action('delete_garment_comment', 'garment_comments', p_target_id);
        v_deleted := true;
      end if;
      if exists (select 1 from public.look_comments where id::text = p_target_id) then
        delete from public.look_comments where id::text = p_target_id;
        perform public.log_admin_action('delete_look_comment', 'look_comments', p_target_id);
        v_deleted := true;
      end if;
      if not v_deleted then
        raise exception 'admin_delete_content: comment % not found', p_target_id
          using errcode = 'P0002';
      end if;
    end if;
  else
    raise exception 'admin_delete_content: unsupported target %', p_target_type
      using errcode = '22023';
  end if;
end;
$$;

-- 2. Resolve / dismiss a report ------------------------------------------------
-- resolved_by and the audit row both derive from auth.uid() inside the
-- definer, so the client can never forge admin attribution.
create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status text,
  p_action_taken text default null
)
returns public.content_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.content_reports;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_resolve_report: caller is not an admin'
      using errcode = '42501';
  end if;

  if p_status not in ('resolved', 'dismissed') then
    raise exception 'admin_resolve_report: invalid status %', p_status
      using errcode = '22023';
  end if;

  update public.content_reports
    set status = p_status,
        resolved_by = auth.uid(),
        resolved_at = now(),
        action_taken = coalesce(p_action_taken, 'none')
    where id = p_report_id
    returning * into v_row;

  if not found then
    raise exception 'admin_resolve_report: report % not found', p_report_id
      using errcode = 'P0002';
  end if;

  perform public.log_admin_action(
    'report_' || p_status,
    'content_reports',
    p_report_id::text,
    jsonb_build_object('actionTaken', coalesce(p_action_taken, 'none'))
  );

  return v_row;
end;
$$;

-- 3. Create or update the site announcement banner ------------------------------
create or replace function public.admin_save_banner(
  p_id uuid default null,
  p_is_active boolean,
  p_text text,
  p_link_url text default null,
  p_link_label text default null,
  p_style text default 'info',
  p_dismissible boolean default true
)
returns public.site_banners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.site_banners;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_save_banner: caller is not an admin'
      using errcode = '42501';
  end if;

  if p_text is null or char_length(trim(p_text)) = 0 then
    raise exception 'admin_save_banner: banner text cannot be empty'
      using errcode = '22023';
  end if;
  if char_length(p_text) > 300 then
    raise exception 'admin_save_banner: banner text exceeds 300 chars'
      using errcode = '22023';
  end if;
  if p_link_url is not null and char_length(p_link_url) > 500 then
    raise exception 'admin_save_banner: link_url exceeds 500 chars'
      using errcode = '22023';
  end if;
  if p_link_label is not null and char_length(p_link_label) > 50 then
    raise exception 'admin_save_banner: link_label exceeds 50 chars'
      using errcode = '22023';
  end if;
  if p_style not in ('info', 'accent', 'warning', 'neutral') then
    raise exception 'admin_save_banner: invalid style %', p_style
      using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.site_banners
      (is_active, text, link_url, link_label, style, dismissible, updated_at, updated_by)
    values
      (p_is_active, p_text, p_link_url, p_link_label, p_style, p_dismissible, now(), auth.uid())
    returning * into v_row;
    perform public.log_admin_action(
      'create_banner', 'site_banners', v_row.id::text,
      jsonb_build_object('isActive', p_is_active, 'style', p_style)
    );
  else
    update public.site_banners
      set is_active = p_is_active,
          text = p_text,
          link_url = p_link_url,
          link_label = p_link_label,
          style = p_style,
          dismissible = p_dismissible,
          updated_at = now(),
          updated_by = auth.uid()
      where id = p_id
      returning * into v_row;
    if not found then
      raise exception 'admin_save_banner: banner % not found', p_id
        using errcode = 'P0002';
    end if;
    perform public.log_admin_action(
      'update_banner', 'site_banners', v_row.id::text,
      jsonb_build_object('isActive', p_is_active, 'style', p_style)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_delete_content(text, text, text) from public;
revoke all on function public.admin_delete_content(text, text, text) from anon;
grant execute on function public.admin_delete_content(text, text, text) to authenticated;

revoke all on function public.admin_resolve_report(uuid, text, text) from public;
revoke all on function public.admin_resolve_report(uuid, text, text) from anon;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

revoke all on function public.admin_save_banner(uuid, boolean, text, text, text, text, boolean) from public;
revoke all on function public.admin_save_banner(uuid, boolean, text, text, text, text, boolean) from anon;
grant execute on function public.admin_save_banner(uuid, boolean, text, text, text, text, boolean) to authenticated;

-- 4. Server-side attribution ---------------------------------------------------
-- resolved_by and updated_by are always overwritten with auth.uid() on any
-- update, so even a hand-crafted request that satisfies RLS cannot forge who
-- made the change. No set_config escape hatch is needed: auth.uid() is the
-- correct value for every legitimate path, including the definer RPCs above.
create or replace function public.trg_content_reports_attribution()
returns trigger as $$
begin
  if new.resolved_by is distinct from old.resolved_by then
    new.resolved_by := auth.uid();
  end if;
  if new.status is distinct from old.status then
    new.resolved_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_content_reports_attribution on public.content_reports;
create trigger trg_content_reports_attribution
  before update on public.content_reports
  for each row execute procedure public.trg_content_reports_attribution();

create or replace function public.trg_site_banners_attribution()
returns trigger as $$
begin
  if new.updated_by is distinct from old.updated_by then
    new.updated_by := auth.uid();
  end if;
  if (new.is_active, new.text, new.link_url, new.link_label, new.style, new.dismissible)
     is distinct from
     (old.is_active, old.text, old.link_url, old.link_label, old.style, old.dismissible) then
    new.updated_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_site_banners_attribution on public.site_banners;
create trigger trg_site_banners_attribution
  before update on public.site_banners
  for each row execute procedure public.trg_site_banners_attribution();
