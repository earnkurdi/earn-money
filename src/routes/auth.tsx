import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: Auth });

function Auth() {
  const { t, lang, setLang, dir } = useT();
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: "/" }); }, [user]);

  const ref = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null;
  if (ref && typeof window !== "undefined") localStorage.setItem("ref_code", ref);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { username, ref_code: localStorage.getItem("ref_code") || null } },
        });
        if (error) throw error;
        toast.success("Welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div dir={dir} className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-[oklch(0.78_0.18_175)] to-[oklch(0.66_0.21_305)] glow-primary" />
          <h1 className="mt-3 text-2xl font-extrabold text-gradient">{t("app_name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("tagline")}</p>
          <button onClick={() => setLang(lang === "ku" ? "en" : "ku")} className="mt-2 text-xs text-muted-foreground underline">
            {t("switch_lang")}
          </button>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 text-sm">
            <button onClick={() => setMode("in")} className={`rounded-lg py-2 ${mode === "in" ? "bg-primary text-primary-foreground" : ""}`}>{t("login")}</button>
            <button onClick={() => setMode("up")} className={`rounded-lg py-2 ${mode === "up" ? "bg-primary text-primary-foreground" : ""}`}>{t("signup")}</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <div><Label>{t("username")}</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} maxLength={32} /></div>
            )}
            <div><Label>{t("email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>{t("password")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : t("continue")}</Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">{t("legal_note")}</p>
      </div>
    </div>
  );
}
