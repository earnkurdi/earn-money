ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS fallback_offerwall_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_offerwall_name text NOT NULL DEFAULT 'Offerwall',
  ADD COLUMN IF NOT EXISTS fallback_offerwall_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_postback_reward_usd numeric NOT NULL DEFAULT 0.100000;