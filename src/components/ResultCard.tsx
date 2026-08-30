"use client";

import { useState } from "react";
import { IconCheck, IconCopy, IconExternal } from "./icons";

interface ResultCardProps {
  repoUrl: string;
  commitUrl: string;
  repoFull: string;
  commitSha: string;
  onReset: () => void;
}

export function ResultCard({ repoUrl, commitUrl, repoFull, commitSha, onReset }: ResultCardProps) {
  const [copied, setCopied] = useState<null | "repo" | "commit">(null);

  async function copy(text: string, which: "repo" | "commit") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // best-effort
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success"
          aria-hidden="true"
        >
          <IconCheck width={18} height={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14.5px] font-bold text-ink-900">اكتمل الرفع</p>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            <span className="ltr font-mono">{repoFull}</span> يعكس الآن محتوى الأرشيف الذي رفعته.
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-3 text-[13px]">
        <Row label="المستودع">
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="ltr press inline-flex items-center gap-1.5 font-mono text-accent hover:underline"
          >
            <span className="allow-select">{repoFull}</span>
            <IconExternal />
          </a>
          <button
            type="button"
            onClick={() => copy(repoUrl, "repo")}
            className="press ms-2 inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[11.5px] text-ink-700 hover:bg-ink-50"
            aria-label="نسخ رابط المستودع"
          >
            <IconCopy />
            {copied === "repo" ? "تم النسخ" : "نسخ الرابط"}
          </button>
        </Row>
        <Row label="الإيداع">
          <a
            href={commitUrl}
            target="_blank"
            rel="noreferrer"
            className="ltr press inline-flex items-center gap-1.5 font-mono text-accent hover:underline"
          >
            <span className="allow-select">{commitSha.slice(0, 7)}</span>
            <IconExternal />
          </a>
          <button
            type="button"
            onClick={() => copy(commitUrl, "commit")}
            className="press ms-2 inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[11.5px] text-ink-700 hover:bg-ink-50"
            aria-label="نسخ رابط الإيداع"
          >
            <IconCopy />
            {copied === "commit" ? "تم النسخ" : "نسخ الرابط"}
          </button>
        </Row>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="btn btn-secondary press"
        >
          رفع أرشيف آخر
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-y-1">
      <dt className="w-24 shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
