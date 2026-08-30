"use client";

import { useState } from "react";
import { GitHubError, verifyCredentials } from "@/lib/github";
import { IconEye, IconEyeOff, IconLock, IconLogout } from "./icons";
import { TokenHelp } from "./TokenHelp";

interface AuthStepProps {
  onAuthenticated: (username: string, token: string) => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  authenticatedUsername?: string;
}

export function AuthStep({
  onAuthenticated,
  onLogout,
  isAuthenticated,
  authenticatedUsername,
}: AuthStepProps) {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success-subtle px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-success"
            aria-hidden="true"
          >
            <IconLock />
          </span>
          <div className="text-[13px]">
            <p className="font-medium text-ink-900">
              تم تسجيل الدخول باسم <span className="ltr allow-select font-mono">{authenticatedUsername}</span>
            </p>
            <p className="text-ink-500">
              يُحفظ الرمز في الذاكرة لهذه الجلسة فقط، ويُحذف عند تسجيل الخروج.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost press"
          onClick={onLogout}
        >
          <IconLogout />
          تسجيل الخروج
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !token.trim()) {
      setError("الرجاء إدخال اسم المستخدم والرمز كليهما.");
      return;
    }
    setLoading(true);
    try {
      const data = await verifyCredentials(username.trim(), token.trim());
      onAuthenticated(data.login, token.trim());
    } catch (err) {
      if (err instanceof GitHubError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("فشل تسجيل الدخول. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="gh-username" className="mb-1 block text-[12.5px] font-medium text-ink-800">
          اسم مستخدم GitHub
        </label>
        <input
          id="gh-username"
          className="input allow-select ltr text-left"
          autoComplete="username"
          spellCheck={false}
          placeholder="octocat"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <label htmlFor="gh-token" className="mb-1 block text-[12.5px] font-medium text-ink-800">
          رمز الوصول الشخصي (Personal Access Token)
        </label>
        <div className="relative">
          <input
            id="gh-token"
            className="input allow-select ltr pe-10 text-left font-mono"
            type={showToken ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder="ghp_••••••••••••••••••••••••••"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            className="press absolute end-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            onClick={() => setShowToken((v) => !v)}
            aria-label={showToken ? "إخفاء الرمز" : "إظهار الرمز"}
            disabled={loading}
          >
            {showToken ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-500">
          لا نرسل الرمز إلى أي جهة سوى واجهة GitHub البرمجية، ولا نقوم بحفظه أبدًا.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[12.5px] text-danger"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary press" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              جارٍ التحقق…
            </>
          ) : (
            "تسجيل الدخول بالرمز"
          )}
        </button>
        <span className="text-[12px] text-ink-500">
          لن يُطلب منك كلمة مرور أبدًا ولن يتم تخزينها.
        </span>
      </div>

      <TokenHelp />
    </form>
  );
}
