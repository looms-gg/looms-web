-- Self-serve GDPR account deletion.
--
-- The client deletes its own profile row; every user-content table references
-- public.profiles(id) with on delete cascade (looks, garments, wardrobe_items,
-- garment_comments, look_comments, profile_presence, likes, rate_limit_events),
-- so one delete clears all user data. Deleting the auth user itself requires
-- the service role, which the anon key cannot do — that step is a documented
-- backoffice action (Dashboard → Auth → Users → Remove).

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'delete_my_account: not authenticated' using errcode = '42501';
  end if;

  delete from public.profiles where id = v_user;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
