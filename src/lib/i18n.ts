import { createContext, useContext } from "react";

export type Lang = "ku" | "en";

export const dict = {
  app_name: { ku: "ئێرن", en: "Earn" },
  tagline: { ku: "ڕاستەقینە ببینە، ڕاستەقینە قازانج بکە", en: "Watch real ads, earn real rewards" },
  login: { ku: "چوونەژوورەوە", en: "Sign in" },
  signup: { ku: "خۆتۆمارکردن", en: "Sign up" },
  email: { ku: "ئیمەیڵ", en: "Email" },
  password: { ku: "وشەی نهێنی", en: "Password" },
  username: { ku: "نازناو", en: "Username" },
  continue: { ku: "بەردەوامبە", en: "Continue" },
  logout: { ku: "چوونەدەرەوە", en: "Sign out" },
  balance: { ku: "بالانس", en: "Balance" },
  lifetime: { ku: "گشتی قازانج", en: "Lifetime" },
  pending: { ku: "چاوەڕوان", en: "Pending" },
  watch_ad: { ku: "بینینی ڕێکلام", en: "Watch ad" },
  watching: { ku: "ڕێکلام دەبینرێت…", en: "Loading ad…" },
  reward_per_ad: { ku: "هەر ڕێکلامێک", en: "Per ad" },
  daily_cap: { ku: "سنووری ڕۆژانە", en: "Daily limit" },
  ads_today: { ku: "ڕێکلام ئەمڕۆ", en: "Ads today" },
  daily_bonus: { ku: "بەخششی ڕۆژانە", en: "Daily bonus" },
  claim: { ku: "وەرگرە", en: "Claim" },
  claimed: { ku: "وەرگیراوە", en: "Claimed" },
  streak: { ku: "ڕۆژی پێکدراو", en: "Day streak" },
  withdraw: { ku: "دەرکێشان", en: "Withdraw" },
  history: { ku: "مێژوو", en: "History" },
  referrals: { ku: "بانگهێشتکراوەکان", en: "Referrals" },
  referral_code: { ku: "کۆدی بانگهێشت", en: "Referral code" },
  referral_link: { ku: "بەستەری بانگهێشت", en: "Referral link" },
  copy: { ku: "لەبەرگرتنەوە", en: "Copy" },
  copied: { ku: "لەبەرگیرایەوە", en: "Copied" },
  amount: { ku: "بڕ", en: "Amount" },
  method: { ku: "ڕێگا", en: "Method" },
  destination: { ku: "ناونیشان / ID", en: "Address / ID" },
  request: { ku: "داواکاری بکە", en: "Request" },
  min_withdraw: { ku: "کەمترین دەرکێشان", en: "Min withdraw" },
  status_pending: { ku: "چاوەڕوان", en: "Pending" },
  status_approved: { ku: "پەسەندکراو", en: "Approved" },
  status_rejected: { ku: "ڕەتکراوەتەوە", en: "Rejected" },
  status_paid: { ku: "پارەدراوە", en: "Paid" },
  insufficient: { ku: "بالانست بەس نییە", en: "Insufficient balance" },
  daily_limit_hit: { ku: "گەیشتیتە سنووری ڕۆژانە", en: "Daily limit reached" },
  ad_reward_credited: { ku: "پاداشت زیادکرا", en: "Reward credited" },
  banned: { ku: "هەژمارت بلۆککراوە", en: "Your account is banned" },
  admin: { ku: "بەڕێوەبەر", en: "Admin" },
  loading: { ku: "چاوەڕێبە…", en: "Loading…" },
  no_data: { ku: "هیچ شت نییە", en: "Nothing here yet" },
  home: { ku: "سەرەکی", en: "Home" },
  switch_lang: { ku: "English", en: "کوردی" },
  ad_failed: { ku: "ڕێکلامەکە نەهات، دواتر هەوڵبدەرەوە", en: "Ad failed to load, try again" },
  ad_blocked_note: { ku: "تکایە ad-block بکوژێنەرەوە", en: "Please disable ad-block" },
  ad_sdk_unavailable: { ku: "سیستەمی ڕێکلامەکان ئێستا بەردەست نییە، دواتر هەوڵبدەرەوە", en: "The ad system is unavailable right now, try again later" },
  ad_unavailable: { ku: "ڕێکلامێکی بەردەست نییە، دواتر هەوڵبدەرەوە", en: "No ad is available right now, try again later" },
  ad_loading_provider: { ku: "سیستەمی ڕێکلام بار دەکرێت…", en: "Loading the ad network…" },
  ad_opening: { ku: "هەوڵدان بۆ کردنەوەی ڕێکلامی ڕاستەقینە…", en: "Opening a real ad…" },
  ad_inventory_empty: { ku: "هیچ ڕێکلامێکی پارەدار بەردەست نییە. ئەمە لە تۆڕی ڕێکلامەکەوەیە، دواتر هەوڵبدەرەوە.", en: "No paid ad inventory is available from the ad network right now. Try again later." },
  ad_not_paid: { ku: "ئەم ڕێکلامە پارەدار نەبوو، پاداشت زیاد نەکرا.", en: "This ad was not paid, so no reward was added." },
  ad_verifying_reward: { ku: "پشتڕاستکردنەوەی پاداشت لە تۆڕی ڕێکلامەکە…", en: "Verifying the reward with the ad network…" },
  ad_postback_missing: { ku: "ڕێکلام بینرا، بەڵام تۆڕی ڕێکلامەکە پاداشتی پشتڕاستکراوی نەنارد. پاداشت زیاد ناکرێت تا پشتڕاست بێتەوە.", en: "The ad was shown, but the ad network did not send a verified reward. No reward is added until it is verified." },
  reward_credit_failed: { ku: "پاداشتەکە پشتڕاست نەکرایەوە، دوبارە هەوڵبدەرەوە", en: "Reward could not be verified, try again" },
  ad_history: { ku: "مێژووی ڕێکلام", en: "Ad history" },
  legal_note: {
    ku: "تەنها بەکارهێنانی ڕاستەقینەی ڕێکلامەکان پاداشت وەردەگرێت. هیچ ئۆتۆ-بەکارهێنانێک نییە. هەژماری دوبارە بلۆک دەکرێت.",
    en: "Only real, voluntary ad views earn rewards. No auto-watching. Duplicate accounts will be banned.",
  },
  revenue: { ku: "داهات", en: "Revenue" },
  total_users: { ku: "بەکارهێنەران", en: "Users" },
  total_impressions: { ku: "بینین", en: "Impressions" },
  total_payouts: { ku: "پارەدانەکان", en: "Payouts" },
  approve: { ku: "پەسەندبکە", en: "Approve" },
  reject: { ku: "ڕەتبکەوە", en: "Reject" },
  mark_paid: { ku: "پارەدراوە", en: "Mark paid" },
  txid: { ku: "TXID", en: "TXID" },
  ban: { ku: "بلۆک", en: "Ban" },
  unban: { ku: "بلۆکهەڵبگرە", en: "Unban" },
  settings: { ku: "ڕێکخستن", en: "Settings" },
  save: { ku: "پاشەکەوت", en: "Save" },
} as const;

export type Key = keyof typeof dict;

export const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "ku",
  setLang: () => {},
});

export function useT() {
  const { lang, setLang } = useContext(I18nContext);
  const t = (k: Key) => dict[k][lang];
  return { t, lang, setLang, dir: lang === "ku" ? "rtl" : "ltr" } as const;
}
