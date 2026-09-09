-- Admin audit trail: append-only record of privileged moderation actions.
-- Rows are written exclusively through log_admin_action(); no update/delete
-- policies exist, so even admins cannot rewrite history.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_table text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log (created_at desc);

create policy "Admins can view the audit log."
  on public.admin_audit_log for select
  using (public.is_admin());

-- Append-only writer. is_admin() is the security-definer gate; RLS is bypassed
-- inside the definer function, so the with-check mirrors it for depth.
create or replace function public.log_admin_action(
  p_action text,
  p_target_table text,
  p_target_id text default null,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null or not public.is_admin(v_admin) then
    raise exception 'log_admin_action: caller is not an admin'
      using errcode = '42501';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, details)
  values (v_admin, p_action, p_target_table, p_target_id, p_details);
end;
$$;

revoke all on function public.log_admin_action(text, text, text, jsonb) from public;
revoke all on function public.log_admin_action(text, text, text, jsonb) from anon;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;

revoke all on public.admin_audit_log from anon;
grant select on public.admin_audit_log to authenticated;
