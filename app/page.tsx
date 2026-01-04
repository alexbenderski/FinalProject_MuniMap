"use client";
import { useState } from "react";
import { signIn } from "@/lib/client/auth-client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { t, isRTL } = useLanguage();

 async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setErr(null);
  setBusy(true);
  try {
    await signIn(email, pass);
    router.push("/dashboard");
  } catch (e: unknown) {
    if (e instanceof Error) {
      setErr(e.message);
    } else {
      setErr(t("login.loginFailed"));
    }
  } finally {
    setBusy(false);
  }
}


  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`w-full max-w-md bg-white shadow-lg rounded-2xl p-8 ${isRTL ? "text-right" : "text-left"}`}>
        {/* Language Switcher */}
        <div className={`flex ${isRTL ? "justify-start" : "justify-end"} mb-4`}>
          <LanguageSwitcher className="bg-blue-600 hover:bg-blue-700 text-white" />
        </div>
        
        <h1 className="text-black font-bold text-center mb-4 text-4xl">
          {t("login.welcome")}
        </h1>
        <p className="text-gray-600 text-sm mb-6 text-center">
          {t("login.description")}
        </p>

        <form onSubmit={onSubmit} className="space-y-4 text-black">
          <div>
            <label className="block font-medium">{t("login.email")}:</label>
            <input
              type="email"
              placeholder={t("login.emailPlaceholder")}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block font-medium">{t("login.password")}:</label>
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <p className="text-xs text-gray-500 flex items-start gap-2">
            <span>🔒</span>
            {t("login.securityNotice")} <strong>{t("login.supportEmail")}</strong> {t("login.forSupport")} <strong>{t("login.supportPhone")}</strong>
          </p>

          <button
            type="submit"
            className="w-full bg-green-400 text-black font-semibold py-2 rounded-md hover:bg-green-500 transition disabled:opacity-60"
            disabled={busy}
          >
            {busy ? t("login.loggingIn") : `🔑 ${t("login.loginButton")}`}
          </button>
        </form>
      </div>
    </main>
  );
}
