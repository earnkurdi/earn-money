
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ref_code text;
  v_referrer uuid;
begin
  v_ref_code := nullif(new.raw_user_meta_data->>'ref_code','');
  if v_ref_code is not null then
    select id into v_referrer from public.profiles where referral_code = v_ref_code;
  end if;

  insert into public.profiles (id, username, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    v_referrer
  ) on conflict do nothing;

  insert into public.balances (user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;

  if v_referrer is not null then
    insert into public.referrals (referrer_id, referred_id)
    values (v_referrer, new.id) on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
