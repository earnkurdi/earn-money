import "../lib/ssr-shim";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { I18nContext, type Lang } from "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Retry</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Earn — Watch ads, earn rewards" },
      { name: "description", content: "Earn real USDT rewards by watching ads. Telegram & email login, daily bonus, referral commissions, fast cashout." },
      { name: "theme-color", content: "#0b1220" },
      { property: "og:title", content: "Earn — Watch ads, earn rewards" },
      { name: "twitter:title", content: "Earn — Watch ads, earn rewards" },
      { property: "og:description", content: "Earn real USDT rewards by watching ads. Telegram & email login, daily bonus, referral commissions, fast cashout." },
      { name: "twitter:description", content: "Earn real USDT rewards by watching ads. Telegram & email login, daily bonus, referral commissions, fast cashout." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/44d0bb12-0dac-4978-996a-02cb4be55ca1/id-preview-f20cb8f2--bea2570d-18f4-4d3f-b78d-f19dcdc211db.lovable.app-1779416687831.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/44d0bb12-0dac-4978-996a-02cb4be55ca1/id-preview-f20cb8f2--bea2570d-18f4-4d3f-b78d-f19dcdc211db.lovable.app-1779416687831.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ku" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [lang, setLangState] = useState<Lang>("ku");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "ku";
    setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ku" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
  }, [lang]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nContext.Provider value={{ lang, setLang: setLangState }}>
        <AuthProvider>
          <Outlet />
          <Toaster theme="dark" position="top-center" richColors />
        </AuthProvider>
      </I18nContext.Provider>
    </QueryClientProvider>
  );
}
