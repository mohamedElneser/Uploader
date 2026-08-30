"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GitHubError, createRepo, getRepo, listRepos, parseRepoUrl } from "@/lib/github";
import type { Repo } from "@/types";
import { IconCheck, IconExternal, IconLink, IconList, IconPlus, IconSearch } from "./icons";

type Mode = "existing" | "new" | "url";

interface RepoStepProps {
  token: string;
  username: string;
  selected: { owner: string; repo: string } | null;
  onSelect: (selection: { owner: string; repo: string } | null, source: "existing" | "new" | "url") => void;
}

export function RepoStep({ token, username, selected, onSelect }: RepoStepProps) {
  const [mode, setMode] = useState<Mode>("existing");
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showPrivateOnly, setShowPrivateOnly] = useState(false);
  const requestRef = useRef(0);

  // New repo form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // URL import
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    if (mode !== "existing") return;
    let alive = true;
    const id = ++requestRef.current;
    setLoadingRepos(true);
    setRepoError(null);
    listRepos(token)
      .then((data) => {
        if (!alive || id !== requestRef.current) return;
        setRepos(data);
      })
      .catch((err) => {
        if (!alive || id !== requestRef.current) return;
        if (err instanceof GitHubError) setRepoError(err.message);
        else if (err instanceof Error) setRepoError(err.message);
        else setRepoError("تعذّر تحميل المستودعات.");
      })
      .finally(() => {
        if (alive && id === requestRef.current) setLoadingRepos(false);
      });
    return () => {
      alive = false;
    };
  }, [mode, token]);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    return repos
      .filter((r) => (showPrivateOnly ? r.private : true))
      .filter((r) => (q ? r.full_name.toLowerCase().includes(q) : true));
  }, [repos, query, showPrivateOnly]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = newName.trim();
    if (!name) {
      setCreateError("الرجاء إدخال اسم المستودع.");
      return;
    }
    setCreating(true);
    try {
      const repo = await createRepo(token, {
        name,
        description: newDesc.trim() || undefined,
        isPrivate,
        autoInit,
      });
      onSelect({ owner: repo.owner?.login || username, repo: repo.name }, "new");
    } catch (err) {
      if (err instanceof GitHubError) setCreateError(err.message);
      else if (err instanceof Error) setCreateError(err.message);
      else setCreateError("تعذّر إنشاء المستودع.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUrlImport(e: React.FormEvent) {
    e.preventDefault();
    setUrlError(null);
    const parsed = parseRepoUrl(urlInput);
    if (!parsed) {
      setUrlError("هذا لا يبدو رابط مستودع GitHub صالحًا أو صيغة owner/repo صحيحة.");
      return;
    }
    setUrlLoading(true);
    try {
      const repo = await getRepo(token, parsed.owner, parsed.repo);
      onSelect({ owner: repo.owner?.login || parsed.owner, repo: repo.name }, "url");
    } catch (err) {
      if (err instanceof GitHubError) setUrlError(err.message);
      else if (err instanceof Error) setUrlError(err.message);
      else setUrlError("تعذّر تحميل هذا المستودع.");
    } finally {
      setUrlLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode switch */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="مصدر المستودع">
        {(
          [
            { key: "existing", label: "استخدام مستودع حالي", icon: <IconList /> },
            { key: "new", label: "إنشاء مستودع جديد", icon: <IconPlus /> },
            { key: "url", label: "الاستيراد برابط", icon: <IconLink /> },
          ] as const
        ).map((opt) => {
          const active = mode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(opt.key)}
              className={[
                "press inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium",
                active
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
              ].join(" ")}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Mode bodies */}
      {mode === "existing" && (
        <div className="space-y-3">
          <p className="text-[12.5px] text-ink-500">
            اختر مستودعًا لاستبداله. تظهر فقط المستودعات التي يمكن للرمز الوصول إليها.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400">
                <IconSearch />
              </span>
              <input
                className="input allow-select ps-8"
                placeholder={`البحث في ${repos?.length ?? ""} مستودع…`.trim()}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loadingRepos || !repos}
              />
            </div>
            <label className="inline-flex select-none items-center gap-2 text-[12.5px] text-ink-700">
              <input
                type="checkbox"
                checked={showPrivateOnly}
                onChange={(e) => setShowPrivateOnly(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-accent focus:ring-accent"
              />
              الخاصة فقط
            </label>
          </div>

          {loadingRepos && (
            <div className="flex items-center gap-2 rounded-md border border-ink-100 bg-ink-50 px-3 py-2 text-[12.5px] text-ink-600">
              <span className="spinner" aria-hidden="true" /> جارٍ تحميل المستودعات…
            </div>
          )}

          {repoError && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[12.5px] text-danger"
            >
              {repoError}
            </div>
          )}

          {repos && !loadingRepos && (
            <div
              className="max-h-72 overflow-y-auto rounded-md border border-ink-100 bg-white"
              role="listbox"
              aria-label="المستودعات المتاحة"
            >
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-[12.5px] text-ink-500">
                  لا توجد مستودعات مطابقة للتصفية الحالية.
                </p>
              )}
              {filtered.map((r) => {
                const isSelected =
                  selected && selected.owner === r.owner?.login
                    ? r.name === selected.repo
                    : false;
                return (
                  <button
                    type="button"
                    key={r.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelect({ owner: r.full_name.split("/")[0], repo: r.name }, "existing")}
                    className={[
                      "press flex w-full items-center justify-between gap-3 border-b border-ink-100 px-3 py-2 text-start last:border-b-0 hover:bg-ink-50",
                      isSelected ? "bg-accent-subtle" : "",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="ltr allow-select truncate font-mono text-[12.5px] text-ink-900">
                          {r.full_name}
                        </span>
                        {r.private ? (
                          <span className="pill pill-warn">خاص</span>
                        ) : (
                          <span className="pill">عام</span>
                        )}
                        {isSelected && (
                          <span className="pill pill-success">
                            <IconCheck /> محدد
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <p className="mt-0.5 truncate text-[12px] text-ink-500">{r.description}</p>
                      )}
                    </div>
                    <a
                      href={r.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="press inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`فتح ${r.full_name} على GitHub في تبويب جديد`}
                    >
                      <IconExternal />
                    </a>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "new" && (
        <form onSubmit={handleCreate} className="space-y-3" noValidate>
          <p className="text-[12.5px] text-ink-500">
            أنشئ مستودعًا جديدًا ضمن <span className="ltr font-mono">{username}</span> واستخدمه
            للرفع.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-repo-name" className="mb-1 block text-[12.5px] font-medium text-ink-800">
                الاسم
              </label>
              <input
                id="new-repo-name"
                className="input allow-select ltr text-left"
                placeholder="my-new-project"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={creating}
              />
            </div>
            <div>
              <label htmlFor="new-repo-desc" className="mb-1 block text-[12.5px] font-medium text-ink-800">
                الوصف <span className="font-normal text-ink-500">(اختياري)</span>
              </label>
              <input
                id="new-repo-desc"
                className="input allow-select"
                placeholder="وصف مختصر"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                disabled={creating}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[13px] text-ink-700">
            <label className="inline-flex select-none items-center gap-2">
              <input
                type="radio"
                name="visibility"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                className="h-4 w-4 border-ink-300 text-accent focus:ring-accent"
              />
              عام
            </label>
            <label className="inline-flex select-none items-center gap-2">
              <input
                type="radio"
                name="visibility"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
                className="h-4 w-4 border-ink-300 text-accent focus:ring-accent"
              />
              خاص
            </label>
            <label className="inline-flex select-none items-center gap-2">
              <input
                type="checkbox"
                checked={autoInit}
                onChange={(e) => setAutoInit(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-accent focus:ring-accent"
              />
              تهيئته بملف README
            </label>
          </div>

          {createError && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[12.5px] text-danger"
            >
              {createError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-primary press" disabled={creating}>
              {creating ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  جارٍ الإنشاء…
                </>
              ) : (
                "إنشاء المستودع"
              )}
            </button>
            {selected && (
              <span className="text-[12.5px] text-ink-500">
                المحدد حاليًا:{" "}
                <span className="ltr font-mono text-ink-800">
                  {selected.owner}/{selected.repo}
                </span>
              </span>
            )}
          </div>
        </form>
      )}

      {mode === "url" && (
        <form onSubmit={handleUrlImport} className="space-y-3" noValidate>
          <p className="text-[12.5px] text-ink-500">
            الصق رابط GitHub (أو <span className="ltr font-mono">owner/repo</span>) لاستيراد
            مستودع يدويًا.
          </p>
          <div>
            <label htmlFor="repo-url" className="mb-1 block text-[12.5px] font-medium text-ink-800">
              رابط المستودع
            </label>
            <input
              id="repo-url"
              className="input allow-select ltr text-left"
              placeholder="https://github.com/owner/repo"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={urlLoading}
            />
          </div>
          {urlError && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[12.5px] text-danger"
            >
              {urlError}
            </div>
          )}
          <div>
            <button type="submit" className="btn btn-primary press" disabled={urlLoading}>
              {urlLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  جارٍ التحميل…
                </>
              ) : (
                "استخدام هذا المستودع"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
