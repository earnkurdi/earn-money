
-- =========================================================
-- ROLES (separate table to prevent privilege escalation)
-- =========================================================
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  telegram_id bigint unique,
  telegram_username text,
  country text,
  language text not null default 'ku',
  referred_by uuid references public.profiles(id),
  referral_code text unique not null default substr(md5(random()::text),1,8),
  is_banned boolean not null default false,
  ban_reason text,
  signup_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin full profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- BALANCES (kept separate so writes are only done server-side)
-- =========================================================
create table public.balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_usd numeric(12,6) not null default 0,
  lifetime_earned_usd numeric(12,6) not null default 0,
  pending_withdraw_usd numeric(12,6) not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.balances enable row level security;

-- Read only; writes happen via SECURITY DEFINER functions / edge functions
create policy "read own balance" on public.balances for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- =========================================================
-- AD WATCHES (one row per verified ad completion)
-- =========================================================
create table public.ad_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,                 -- monetag / adsterra / propellerads / offerwall
  reward_usd numeric(12,6) not null,
  postback_id text unique,                -- dedupe key from ad network
  ip text,
  user_agent text,
  country text,
  created_at timestamptz not null default now()
);
alter table public.ad_watches enable row level security;
create index on public.ad_watches(user_id, created_at desc);

create policy "read own watches" on public.ad_watches for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- =========================================================
-- WITHDRAWALS
-- =========================================================
create type public.withdrawal_status as enum ('pending','approved','rejected','paid');
create type public.withdrawal_method as enum ('usdt_trc20','binance_pay','faucetpay');

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method withdrawal_method not null,
  destination text not null,             -- wallet / binance id / faucetpay email
  amount_usd numeric(12,6) not null,
  status withdrawal_status not null default 'pending',
  txid text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.withdrawals enable row level security;
create index on public.withdrawals(user_id, created_at desc);
create index on public.withdrawals(status);

create policy "read own withdrawals" on public.withdrawals for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admin update withdrawals" on public.withdrawals for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- REFERRALS
-- =========================================================
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade unique,
  commission_earned_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
create policy "read own referrals" on public.referrals for select to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referred_id or public.has_role(auth.uid(),'admin'));

-- =========================================================
-- DAILY BONUS
-- =========================================================
create table public.daily_bonus_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null default current_date,
  amount_usd numeric(12,6) not null,
  streak_day int not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);
alter table public.daily_bonus_claims enable row level security;
create policy "read own bonus" on public.daily_bonus_claims for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- =========================================================
-- APP SETTINGS (single-row config table, dynamic reward rates)
-- =========================================================
create table public.app_settings (
  id int primary key default 1,
  reward_per_ad_usd numeric(12,6) not null default 0.002,
  daily_ad_cap int not null default 50,
  min_withdraw_usd numeric(12,6) not null default 1.00,
  referral_percent numeric(5,2) not null default 10.00,
  daily_bonus_base_usd numeric(12,6) not null default 0.01,
  estimated_cpm_usd numeric(8,4) not null default 3.00,
  revenue_share_percent numeric(5,2) not null default 60.00,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
alter table public.app_settings enable row level security;
create policy "anyone read settings" on public.app_settings for select to authenticated using (true);
create policy "admin update settings" on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.app_settings (id) values (1);

-- =========================================================
-- FRAUD LOGS
-- =========================================================
create table public.fraud_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event text not null,
  details jsonb,
  ip text,
  created_at timestamptz not null default now()
);
alter table public.fraud_logs enable row level security;
create policy "admin read fraud" on public.fraud_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- AUTO-CREATE profile + balance on signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)))
    on conflict do nothing;
  insert into public.balances (user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- updated_at helper
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();
create trigger trg_withdrawals_touch before update on public.withdrawals
  for each row execute procedure public.touch_updated_at();
create trigger trg_settings_touch before update on public.app_settings
  for each row execute procedure public.touch_updated_at();
