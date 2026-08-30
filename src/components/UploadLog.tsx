"use client";

import type { UploadLogEntry, UploadPhase } from "@/types";
import { IconCheck, IconAlert, IconInfo } from "./icons";

interface UploadLogProps {
  entries: UploadLogEntry[];
  phase: UploadPhase;
}

const PHASE_LABEL: Record<UploadPhase, string> = {
  idle: "خامل",
  verifying: "التحقق من اسم المستخدم والرمز",
  authenticated: "تم تسجيل الدخول",
  reading: "قراءة أرشيف ZIP",
  unzipping: "فك ضغط الأرشيف",
  connecting: "الاتصال بـ GitHub",
  "creating-repo": "إنشاء المستودع",
  "deleting-files": "إزالة الملفات القديمة",
  "uploading-files": "رفع الملفات الجديدة",
  done: "اكتمل الرفع",
  error: "حدث خطأ",
};

export function UploadLog({ entries, phase }: UploadLogProps) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {(phase !== "idle" && phase !== "done" && phase !== "error") && (
            <span className="spinner" aria-hidden="true" />
          )}
          <p className="text-[12.5px] font-medium text-ink-800">
            {PHASE_LABEL[phase]}
          </p>
        </div>
        {phase === "done" && (
          <span className="pill pill-success">
            <IconCheck /> تم
          </span>
        )}
        {phase === "error" && (
          <span className="pill pill-danger">
            <IconAlert /> فشل
          </span>
        )}
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
        {entries.length === 0 && (
          <li className="flex items-start gap-2 text-[12.5px] text-ink-500">
            <span className="mt-0.5 text-ink-400" aria-hidden="true">
              <IconInfo />
            </span>
            سيظهر سجل الرفع هنا بمجرد البدء.
          </li>
        )}
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-[12.5px]">
            <span
              className={[
                "mt-0.5",
                e.kind === "error"
                  ? "text-danger"
                  : e.kind === "warn"
                  ? "text-warn"
                  : e.kind === "success"
                  ? "text-success"
                  : "text-ink-500",
              ].join(" ")}
              aria-hidden="true"
            >
              {e.kind === "error" ? (
                <IconAlert />
              ) : e.kind === "warn" ? (
                <IconAlert />
              ) : e.kind === "success" ? (
                <IconCheck />
              ) : (
                <IconInfo />
              )}
            </span>
            <span
              className={[
                "allow-select",
                e.kind === "error"
                  ? "text-danger"
                  : e.kind === "warn"
                  ? "text-warn"
                  : e.kind === "success"
                  ? "text-ink-800"
                  : "text-ink-700",
              ].join(" ")}
            >
              {e.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
