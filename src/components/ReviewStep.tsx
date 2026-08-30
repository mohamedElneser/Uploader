"use client";

import { useState } from "react";
import type { ExtractedProject } from "@/lib/zip";
import { humanSize } from "@/lib/zip";
import { IconAlert, IconCheck } from "./icons";

interface ReviewStepProps {
  project: ExtractedProject;
  selection: { owner: string; repo: string };
  selectionSource: "existing" | "new" | "url";
  confirmed: boolean;
  onConfirm: (value: boolean) => void;
  onProceed: () => void;
  canProceed: boolean;
  busy: boolean;
}

export function ReviewStep({
  project,
  selection,
  selectionSource,
  confirmed,
  onConfirm,
  onProceed,
  canProceed,
  busy,
}: ReviewStepProps) {
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Summary label="المستودع الهدف">
          <p className="ltr allow-select font-mono text-[13.5px] text-ink-900">
            {selection.owner}/{selection.repo}
          </p>
          <p className="text-[12px] text-ink-500">
            المصدر:{" "}
            {selectionSource === "existing"
              ? "مستودع حالي"
              : selectionSource === "new"
              ? "مستودع تم إنشاؤه حديثًا"
              : "مستورد عبر رابط"}
          </p>
        </Summary>
        <Summary label="الأرشيف">
          <p className="text-[13.5px] text-ink-900">
            {project.fileCount} ملف · {project.dirCount} مجلد · {humanSize(project.totalSize)}
          </p>
          <button
            type="button"
            onClick={() => setShowWarnings((v) => !v)}
            className="press text-[12px] text-accent hover:underline"
          >
            {showWarnings ? "إخفاء" : "إظهار"} التفاصيل
          </button>
        </Summary>
      </div>

      {showWarnings && (
        <div className="rounded-md border border-ink-100 bg-ink-50 p-3 text-[12.5px] text-ink-700">
          {project.warnings.length > 0 ? (
            <>
              <p className="font-medium text-ink-800">ملاحظات من فحص الأرشيف</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-5">
                {project.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>لم يتم العثور على أي مشاكل أثناء الفحص.</p>
          )}
        </div>
      )}

      <div
        role="alert"
        className="rounded-md border border-danger/30 bg-danger-subtle p-3"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-danger" aria-hidden="true">
            <IconAlert />
          </span>
          <div className="text-[12.5px] leading-relaxed text-ink-800">
            <p className="font-medium text-danger">سيؤدي هذا إلى حذف الملفات الحالية في المستودع</p>
            <p className="mt-1 text-ink-700">
              ستتم إزالة كل ملف موجود حاليًا في{" "}
              <span className="ltr font-mono">{selection.owner}/{selection.repo}</span> واستبداله
              بمحتوى ملف ZIP. سيتم الحفاظ على تاريخ Git، لكن الشجرة السابقة ستختفي. إذا كان
              المستودع خاصًا وله متعاونون، فسيحتفظون بوصولهم. يُفضّل إنشاء فرع نسخ احتياطي أولًا
              إذا كنت تريد إمكانية التراجع بسهولة.
            </p>
          </div>
        </div>
      </div>

      <label className="flex select-none items-start gap-2.5 text-[13px] text-ink-800">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirm(e.target.checked)}
          className="mt-[3px] h-4 w-4 rounded border-ink-300 text-accent focus:ring-accent"
        />
        <span>
          أدرك أن المحتوى الحالي سيُستبدل. المتابعة مع الرفع.
        </span>
      </label>

      <button
        type="button"
        onClick={onProceed}
        disabled={!canProceed}
        className="btn btn-primary press w-full justify-center py-2.5 text-[14px] sm:w-auto"
      >
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            جارٍ العمل…
          </>
        ) : (
          <>
            <IconCheck />
            استبدال ورفع
          </>
        )}
      </button>
    </div>
  );
}

function Summary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-100 bg-ink-50 p-3">
      <p className="eyebrow">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
