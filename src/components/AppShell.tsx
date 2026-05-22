import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PlayCircle, Wallet, Users, Shield } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, dir } = useT();
  const { user, isAdmin, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/", icon: Home, key: "home" as const },
    { to: "/watch", icon: PlayCircle, key: "watch_ad" as const },
    { to: "/withdraw", icon: Wallet, key: "withdraw" as const },
    { to: "/referrals", icon: Users, key: "referrals" as const },
  ];

  return (
    <div dir={dir} className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.18_175)] to-[oklch(0.66_0.21_305)] glow-primary" />
            <span className="text-lg font-bold text-gradient">{t("app_name")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "ku" ? "en" : "ku")}
              className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("switch_lang")}
            </button>
            {isAdmin && (
              <Link to="/admin" className="rounded-lg border border-border px-2 py-1 text-xs">
                <Shield className="inline size-3" /> {t("admin")}
              </Link>
            )}
            {user && (
              <Button size="sm" variant="ghost" onClick={signOut} className="text-xs">{t("logout")}</Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">{children}</main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-30 glass">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.to === "/" ? path === "/" : path.startsWith(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="size-5" />
                  {t(tab.key)}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
