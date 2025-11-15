"use client";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

 async function onSubmit(e: React.FormEvent) { //“המשתנה e הוא אובייקט של אירוע שמגיע מטופס (Form Event) ב-React.”
  e.preventDefault();
  setErr(null);
  setBusy(true);
  try {
    await signIn(email, pass); //  Firebase Auth check
    router.push("/dashboard");
  } catch (e: unknown) {
    if (e instanceof Error) {
      setErr(e.message);
    } else {
      setErr("Login failed");
    }
  } finally {
    setBusy(false);
  }
}


  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-black font-bold text-center mb-4 text-4xl">
          Welcome to the MuniMap System.
        </h1>
        <p className="text-gray-600 text-sm mb-6 text-center">
          This platform is designed for municipal employees to monitor, manage,
          and respond to public reports across the city. Please log in using your
          assigned credentials.
        </p>

        <form onSubmit={onSubmit} className="space-y-4 text-black">
          <div>
            <label className="block font-medium">Email:</label>
            <input
              type="email"
              placeholder="you@city.gov.il"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium">Password:</label>
            <input
              type="password"
              placeholder="******"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <p className="text-xs text-gray-500 flex items-start gap-2">
            <span>🔒</span>
            For authorized internal use only. Unauthorized access is prohibited.
            Contact IT at <strong>munimap@gmail.com</strong> or call{" "}
            <strong>+972-4-1234567</strong> for support.
          </p>

          <button
            type="submit"
            className="w-full bg-green-400 text-black font-semibold py-2 rounded-md hover:bg-green-500 transition disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Logging in…" : "🔑 Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
