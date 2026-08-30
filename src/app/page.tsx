"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthStep } from "@/components/AuthStep";
import { RepoStep } from "@/components/RepoStep";
import { UploadStep } from "@/components/UploadStep";
import { ReviewStep } from "@/components/ReviewStep";
import { UploadLog } from "@/components/UploadLog";
import { ResultCard } from "@/components/ResultCard";
import { StepHeader } from "@/components/StepHeader";
import { IconCheck, IconInfo, IconLock, IconUpload } from "@/components/icons";
import {
  getBranchSha,
  getRepo,
  GitHubError,
  listRepoFiles,
} from "@/lib/github";
import { toBase64 } from "@/lib/zip";
import type { ExtractedProject } from "@/lib/zip";
import type { UploadLogEntry, UploadPhase } from "@/types";

type Stage = "auth" | "repo" | "review" | "running" | "done";

interface SessionCreds {
  username: string;
  token: string;
}

export default function HomePage() {
  const [creds, setCreds] = useState<SessionCreds | null>(null);
  const [selection, setSelection] = useState<{ owner: string; repo: string } | null>(null);
  const [selectionSource, setSelectionSource] = useState<"existing" | "new" | "url">("existing");
  const [project, setProject] = useState<ExtractedProject | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [stage, setStage] = useState<Stage>("auth");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [log, setLog] = useState<UploadLogEntry[]>([]);
  const [result, setResult] = useState<{
    repoUrl: string;
    commitUrl: string;
    commitSha: string;
  } | null>(null);
  const logIdRef = useRef(0);

  // Always reflect the latest phase inside callbacks without re-creating them.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const reset = useCallback(() => {
    setStage("auth");
    setSelection(null);
    setSelectionSource("existing");
    setProject(null);
    setZipFile(null);
    setConfirmed(false);
    setPhase("idle");
    setLog([]);
    setResult(null);
  }, []);

  const onAuthenticated = useCallback((username: string, token: string) => {
    setCreds({ username, token });
    setStage("repo");
  }, []);

  const onLogout = useCallback(() => {
    setCreds(null);
    setSelection(null);
    setProject(null);
    setZipFile(null);
    setConfirmed(false);
    setPhase("idle");
    setLog([]);
    setResult(null);
    setStage("auth");
  }, []);

  const onSelect = useCallback(
    (sel: { owner: string; repo: string } | null, source: "existing" | "new" | "url") => {
      setSelection(sel);
      setSelectionSource(source);
    },
    [],
  );

  const onExtracted = useCallback((p: ExtractedProject, file: File) => {
    setProject(p);
    setZipFile(file);
    // Reset confirmation whenever a new archive is loaded.
    setConfirmed(false);
  }, []);

  const clearProject = useCallback(() => {
    setProject(null);
    setZipFile(null);
    setConfirmed(false);
  }, []);

  // -------------------------------------------------------------- upload
  async function runUpload() {
    if (!creds || !selection || !project) return;
    setStage("running");
    setPhase("connecting");
    setResult(null);
    setLog([]);

    const { token } = creds;
    const { owner, repo } = selection;

    const add = (text: string, kind: UploadLogEntry["kind"] = "info") => {
      logIdRef.current += 1;
      setLog((prev) => [
        ...prev,
        { id: logIdRef.current, text, kind, phase: phaseRef.current },
      ]);
    };

    try {
      add("جارٍ الاتصال بـ GitHub…");
      const meta = await getRepo(token, owner, repo);
      add(`تم العثور على المستودع: ${meta.full_name}`, "success");
      const branch = meta.default_branch;
      add(`الفرع الافتراضي: ${branch}`);

      setPhase("deleting-files");
      add("جارٍ قراءة قائمة الملفات الحالية…");
      const existing = await listRepoFiles(token, owner, repo, branch);
      add(`تم العثور على ${existing.length} ملف حالي لمسحه.`);

      setPhase("uploading-files");
      add("جارٍ تجهيز الرفع…");

      // 1) Create blobs for every file.
      const total = project.files.length;
      add(`جارٍ إنشاء ${total} كائن بيانات (blob)…`);
      const treeEntries: { path: string; sha: string; mode: "100644" }[] = [];
      for (let i = 0; i < project.files.length; i++) {
        const f = project.files[i];
        if ((i % 25) === 0) {
          add(`جارٍ الرفع ${i + 1}/${total}: ${f.path}`);
        }
        const b64 = toBase64(f.content);
        const sha = await createBlobApi(token, owner, repo, b64);
        treeEntries.push({ path: f.path, sha, mode: "100644" });
      }
      add(`تم إنشاء جميع الكائنات (${total}).`, "success");

      add("جارٍ بناء الشجرة الجديدة…");
      // Mark every existing file that is NOT in the new archive for deletion
      // (sha: null) so the previous tree is fully replaced.
      const newPaths = new Set(treeEntries.map((e) => e.path));
      const deleteEntries = existing
        .filter((f) => !newPaths.has(f.path))
        .map((f) => ({ path: f.path, sha: null as unknown as string }));
      const newTreeSha = await createTreeApi(
        token,
        owner,
        repo,
        [...deleteEntries, ...treeEntries],
      );

      add("جارٍ إنشاء الإيداع (Commit)…");
      const parentSha = await getBranchSha(token, owner, repo, branch);
      const commit = await createCommitApi(token, owner, repo, {
        message: "Replace old project with new project",
        treeSha: newTreeSha,
        parentSha,
      });
      add(`تم إنشاء الإيداع ${commit.sha.slice(0, 7)}.`, "success");

      add(`جارٍ تحديث ${branch}…`);
      await updateRefApi(token, owner, repo, branch, commit.sha);
      add("تم تحديث الفرع.", "success");

      setResult({
        repoUrl: meta.html_url,
        commitUrl: commit.html_url,
        commitSha: commit.sha,
      });
      setPhase("done");
      setStage("done");
      add("اكتمل الرفع.", "success");
    } catch (err) {
      const message = err instanceof GitHubError
        ? err.message
        : err instanceof Error
        ? err.message
        : "فشل الرفع.";
      setPhase("error");
      add(message, "error");
    }
  }

  // Stage completion
  const authDone = !!creds;
  const repoDone = !!selection;
  const uploadDone = !!project;
  const reviewDone = uploadDone && repoDone && confirmed;

  return (
    <div className="min-h-screen w-full bg-grid-fade">
      <Header onLogout={onLogout} authenticated={!!creds} />

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
        {/* Hero — short, not marketing */}
        <section className="mb-8">
          <span className="eyebrow">أداة نشر المستودعات</span>
          <h1 className="mt-1.5 font-display text-[24px] font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[30px]">
            استبدال مستودع GitHub بأرشيف ZIP
          </h1>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-500">
            سجّل الدخول برمز وصول شخصي، اختر مستودعًا حاليًا أو أنشئ مستودعًا جديدًا، ثم ارفع
            ملف ZIP. سيحل محتوى الأرشيف محل الملفات الحالية في المستودع ضمن عملية إيداع واحدة.
          </p>
        </section>

        {/* Step list */}
        <ol>
          <Step
            index={1}
            title="تسجيل الدخول برمز وصول شخصي"
            done={authDone}
            active={!authDone}
            icon={<IconLock />}
          >
            <AuthStep
              onAuthenticated={onAuthenticated}
              onLogout={onLogout}
              isAuthenticated={!!creds}
              authenticatedUsername={creds?.username}
            />
          </Step>

          <Step
            index={2}
            title="اختيار مستودع"
            done={repoDone}
            active={authDone && !repoDone}
            icon={<IconInfo />}
            disabled={!creds}
          >
            {creds ? (
              <RepoStep
                token={creds.token}
                username={creds.username}
                selected={selection}
                onSelect={onSelect}
              />
            ) : (
              <DisabledHint>سجّل الدخول أولًا لتحميل مستودعاتك.</DisabledHint>
            )}
          </Step>

          <Step
            index={3}
            title="رفع الأرشيف وفحصه"
            done={uploadDone}
            active={authDone && repoDone && !uploadDone}
            icon={<IconUpload />}
            disabled={!creds}
          >
            <UploadStep
              project={project}
              fileName={zipFile?.name ?? null}
              onExtracted={onExtracted}
              onClear={clearProject}
            />
          </Step>

          <Step
            index={4}
            title="المراجعة والتأكيد"
            done={reviewDone || stage === "done"}
            active={uploadDone && repoDone && !confirmed && stage !== "running" && stage !== "done"}
            icon={<IconCheck />}
            disabled={!project || !selection}
          >
            {project && selection ? (
              <ReviewStep
                project={project}
                selection={selection}
                selectionSource={selectionSource}
                confirmed={confirmed}
                onConfirm={setConfirmed}
                onProceed={runUpload}
                canProceed={confirmed && stage !== "running"}
                busy={stage === "running"}
              />
            ) : (
              <DisabledHint>
                اختر مستودعًا وارفع ملف ZIP لتفعيل هذه الخطوة.
              </DisabledHint>
            )}
          </Step>
        </ol>

        {/* Live status */}
        {(stage === "running" || stage === "done") && (
          <section className="mt-6">
            <h2 className="eyebrow mb-2">الحالة</h2>
            <UploadLog entries={log} phase={phase} />
            {phase === "done" && result && selection && (
              <div className="mt-4">
                <ResultCard
                  repoUrl={result.repoUrl}
                  commitUrl={result.commitUrl}
                  commitSha={result.commitSha}
                  repoFull={`${selection.owner}/${selection.repo}`}
                  onReset={reset}
                />
              </div>
            )}
          </section>
        )}

        {phase === "error" && stage === "running" && (
          <section className="mt-4 rounded-md border border-danger/30 bg-danger-subtle p-3 text-[12.5px] text-ink-800">
            <p className="font-medium text-danger">توقف الرفع قبل الاكتمال.</p>
            <p className="mt-1 text-ink-700">
              راجع سجل الحالة أعلاه لمعرفة السبب الدقيق. قد يكون المستودع الآن في حالة تحديث
              جزئي؛ راجعه على GitHub قبل إعادة المحاولة.
            </p>
            <button
              type="button"
              onClick={() => setStage("review")}
              className="btn btn-secondary press mt-2"
            >
              العودة إلى المراجعة
            </button>
          </section>
        )}

        <Footer />
      </main>
    </div>
  );
}

function Step({
  index,
  title,
  done,
  active,
  icon,
  disabled,
  children,
}: {
  index: number;
  title: string;
  done?: boolean;
  active?: boolean;
  icon: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="pb-4">
      <div
        className={[
          "card p-4 sm:p-5",
          disabled ? "opacity-60" : "",
        ].join(" ")}
        aria-disabled={disabled || undefined}
      >
        <div className="flex items-start gap-3">
          <span className="relative shrink-0">
            <span
              className={[
                "no-select relative z-10 mt-[2px] flex h-6 w-6 items-center justify-center rounded-full border bg-white text-ink-500",
                done ? "border-accent bg-accent text-white" : "border-ink-200",
              ].join(" ")}
              aria-hidden="true"
            >
              {done ? <IconCheck width={14} height={14} /> : icon}
            </span>
            <span
              className={["rail-line", done ? "rail-line-done" : ""].join(" ")}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <StepHeader index={index} title={title} done={done} active={active} />
            <div className="mt-3">{children}</div>
          </div>
        </div>
      </div>
    </li>
  );
}

function DisabledHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-100 bg-ink-50 px-3 py-2.5 text-[12.5px] text-ink-500">
      {children}
    </div>
  );
}

function Header({ onLogout, authenticated }: { onLogout: () => void; authenticated: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white"
            aria-hidden="true"
          >
            <IconUpload width={15} height={15} />
          </span>
          <span className="font-display text-[14.5px] font-bold tracking-tight text-ink-900">
            رافع مستودعات GitHub
          </span>
        </div>
        {authenticated && (
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost press"
          >
            تسجيل الخروج
          </button>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-ink-100 pt-4 text-[12px] leading-relaxed text-ink-400">
      <p>
        لا يُكتب رمزك (Token) على القرص أبدًا، ويُحذف عند تسجيل الخروج أو إغلاق التبويب. تتم
        عمليات GitHub مباشرة من متصفحك إلى api.github.com.
      </p>
    </footer>
  );
}

// ---------------------------------------------------------------- API helpers
// Thin wrappers so the upload loop reads top-down. Each wrapper throws GitHubError
// on failure, which the catch block converts into a friendly log message.
async function createBlobApi(
  token: string,
  owner: string,
  repo: string,
  contentBase64: string,
) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ content: contentBase64, encoding: "base64" }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(blobMessage(res.status, body), res.status, body);
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function createTreeApi(
  token: string,
  owner: string,
  repo: string,
  entries: { path: string; sha: string | null; mode?: "100644" | "100755" | "040000" }[],
) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      tree: entries.map((e) => {
        if (e.sha === null) {
          // Mark file for deletion by sending sha: null and no mode/type.
          return { path: e.path, sha: null };
        }
        return {
          path: e.path,
          mode: e.mode || "100644",
          type: "blob",
          sha: e.sha,
        };
      }),
    }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر إنشاء شجرة الملفات (HTTP ${res.status}). ${extractMsg(body)}`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function createCommitApi(
  token: string,
  owner: string,
  repo: string,
  params: { message: string; treeSha: string; parentSha: string },
) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: params.message,
      tree: params.treeSha,
      parents: [params.parentSha],
    }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر إنشاء الإيداع (HTTP ${res.status}). ${extractMsg(body)}`,
      res.status,
      body,
    );
  }
  return (await res.json()) as { sha: string; html_url: string };
}

async function updateRefApi(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  newSha: string,
) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ sha: newSha, force: true }),
    },
  );
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر تحديث الفرع (HTTP ${res.status}). ${extractMsg(body)}`,
      res.status,
      body,
    );
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function extractMsg(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

function blobMessage(status: number, body: unknown) {
  if (status === 413) return "أحد الملفات في الأرشيف أكبر من الحد المسموح به في واجهة GitHub.";
  if (status === 422) return `رفض GitHub أحد الملفات: ${extractMsg(body) || "محتوى غير صالح"}.`;
  if (status === 403) {
    const msg = extractMsg(body).toLowerCase();
    if (msg.includes("rate")) {
      return "تم بلوغ الحد الأقصى لطلبات واجهة GitHub. انتظر بضع دقائق ثم أعد المحاولة.";
    }
    return "تم رفض الإذن. قد يفتقر الرمز إلى صلاحية 'Contents: Write'.";
  }
  return `تعذّر رفع كائن ملف (HTTP ${status}). ${extractMsg(body)}`;
}
