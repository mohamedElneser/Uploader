"use client";

import { useState } from "react";
import { IconChevron } from "./icons";

export function TokenHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="press flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
        aria-expanded={open}
        aria-controls="token-help-panel"
      >
        <div className="flex items-center gap-2">
          <span className="eyebrow">مساعدة</span>
          <span className="text-[13px] font-medium text-ink-800">
            كيف أحصل على رمز وصول شخصي؟
          </span>
        </div>
        <span
          aria-hidden="true"
          className={[
            "text-ink-400 transition-transform rtl:-scale-x-100",
            open ? "rotate-90" : "rotate-0",
          ].join(" ")}
        >
          <IconChevron />
        </span>
      </button>
      {open && (
        <div id="token-help-panel" className="card-divider px-4 pb-4 pt-4 text-[13px] leading-relaxed text-ink-700">
          <ol className="list-decimal space-y-1.5 ps-5">
            <li>سجّل الدخول إلى <strong>github.com</strong>.</li>
            <li>اضغط على صورتك الشخصية، ثم افتح <strong>Settings</strong>.</li>
            <li>مرّر إلى أسفل الشريط الجانبي وافتح <strong>Developer settings</strong>.</li>
            <li>افتح <strong>Personal access tokens</strong>.</li>
            <li>اختر <strong>Fine-grained tokens</strong> (موصى به) أو <strong>Tokens (classic)</strong>.</li>
            <li>
              اضغط <strong>Generate new token</strong>، أعطه اسمًا واضحًا، حدّد تاريخ انتهاء،
              واختر صلاحيات الوصول المناسبة للمستودع.
            </li>
            <li>
              انسخ الرمز الناتج واحفظه في مكان آمن. لن يعرضه GitHub إلا مرة واحدة.
            </li>
          </ol>

          <div className="mt-4 rounded-md border border-ink-100 bg-ink-50 p-3 text-ink-700">
            <p className="font-medium text-ink-800">الصلاحيات المطلوبة</p>
            <ul className="mt-1.5 list-disc space-y-1 ps-5">
              <li>
                <strong>قراءة (Read)</strong> للبيانات الوصفية والمحتوى (لعرض مستودعاتك وفحصها).
              </li>
              <li>
                <strong>كتابة (Write)</strong> للمحتوى (لدفع الملفات الجديدة وإنشاء الإيداعات).
              </li>
              <li>
                <strong>إنشاء (Create)</strong> للمستودعات (فقط إذا كنت تخطط لإنشاء مستودع جديد
                من داخل التطبيق).
              </li>
            </ul>
            <p className="mt-2 text-ink-500">
              يجب تحديد نطاق رموز Fine-grained على المستودعات التي تنوي تحديثها تحديدًا، أو على
              &ldquo;All repositories&rdquo; إذا أردت مرونة كاملة. امنح أقل مجموعة صلاحيات
              تحتاجها فعليًا.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
