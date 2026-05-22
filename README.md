# Earn — Real rewarded-ads earning platform

A mobile-first, dark/futuristic web app where users **voluntarily** watch ads and earn real USDT rewards. Built on Lovable Cloud (managed Supabase) with TanStack Start.

> ⚠️ **Honest economics:** rewarded-ad CPM is typically $2–$15 per 1,000 views. Real per-ad rewards are **fractions of a cent**. The app intentionally avoids fake balances and auto-watch. Withdrawals are **admin-approved manual payouts** in v1 — the safest, most legal model.

## Features
- Email auth (Telegram WebApp can be added — see below)
- Daily ad watches with **server-side S2S postback verification** (no client-side credit)
- Real `balances` table updated only by the postback edge function
- Daily bonus with streak (up to 7×)
- Referral system (configurable %)
- USDT TRC20 / Binance Pay / FaucetPay withdrawal requests
- Admin dashboard: approve / reject / mark-paid (with TXID), ban / unban, edit dynamic rates
- Sorani Kurdish (default, RTL) + English
- Anti-fraud: daily cap, ban flag, unique postback IDs, IP/UA logging

## Required setup — ad networks (S2S)
The client calls `window.show_monetag({ type: "end", ymid: <user_id> })`. The network then POSTs to the **postback URL** which credits the user. **Without configuring this, no balance changes happen.**

1. Sign up for **Monetag / Adsterra / PropellerAds** as a publisher.
2. Add their JS SDK in `src/routes/__root.tsx` (a `<script>` in `head.links`/`scripts`).
3. In the network dashboard, set the postback URL to:
   ```
   https://<your-project>.supabase.co/functions/v1/ad-postback?user={ymid}&reward_id={click_id}&provider=monetag&sig={sig}
   ```
   Where `{sig}` is HMAC-SHA256 of `user|reward_id|provider` using your `AD_POSTBACK_SECRET`. Most networks let you compute this server-side in their dashboard via a "macro signature" — if not, route postbacks through your own thin proxy that computes and appends the signature before forwarding to this URL.

## Secrets (already set in Lovable Cloud)
- `AD_POSTBACK_SECRET` — used to verify ad-network postbacks
- `TELEGRAM_BOT_TOKEN` — for optional Telegram WebApp login
- `IPQS_API_KEY` — optional, for VPN/proxy detection

## Bootstrapping
1. Sign up the first account.
2. Visit `/admin` and click **Claim admin**. (Only works while zero admins exist.)
3. Tune `app_settings` from the admin page (per-ad reward, daily cap, min withdraw, referral %, etc.).

## Revenue & payout math
- `revenue ≈ ad_watches × (reward_per_ad_usd / revenue_share_percent%)`
- Per-user max daily ≈ `daily_ad_cap × reward_per_ad_usd + daily_bonus`
- Start conservatively (e.g. `0.001`/ad, cap 30). Raise once revenue is proven.

## Deploy
Push to GitHub then deploy on Vercel/Netlify/Render. All edge functions live in Lovable Cloud and deploy automatically.
