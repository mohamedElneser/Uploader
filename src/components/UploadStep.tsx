"use client";

import { useCallback, useRef, useState } from "react";
import { extractFiles, humanSize, readZipFile } from "@/lib/zip";
import type { ExtractedProject } from "@/lib/zip";
import { IconFile, IconFolder, IconUpload } from "./icons";

interface UploadStepProps {
  onExtracted: (project: ExtractedProject, file: File) => void;
  project: ExtractedProject | null;
  fileName: string | null;
  onClear: () => void;
}

export function UploadStep({ onExtracted, project, fileName, onClear }: UploadStepProps) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setError("الملفات المدعومة هي .zip فقط.");
        return;
      }
      setBusy(true);
      try {
        const zip = await readZipFile(file);
        const extracted = await extractFiles(zip);
        if (extracted.files.length === 0) {
          setError("لا يحتوي أرشيف ZIP على أي ملفات.");
          return;
        }
        onExtracted(extracted, file);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("تعذّرت قراءة أرشيف ZIP.");
      } finally {
        setBusy(false);
      }
    },
    [onExtracted],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  return (
    <div className="space-y-3">
      {!project && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            "rounded-md border-2 border-dashed bg-white px-4 py-8 text-center transition-colors",
            dragOver ? "border-accent bg-accent-subtle" : "border-ink-200",
          ].join(" ")}
        >
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-ink-200 text-ink-600">
            <IconUpload width={18} height={18} />
          </div>
          <p className="mt-3 text-[13.5px] font-medium text-ink-900">
            أفلت ملف ZIP هنا، أو
          </p>
          <p className="mt-1 text-[12.5px] text-ink-500">
            بحد أقصى 50 ميجابايت لكل ملف، و200 ميجابايت إجمالًا. يتم تجاهل ملفات نظام macOS وWindows.
          </p>
          <div className="mt-4">
            <button
              type="button"
              className="btn btn-secondary press"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  جارٍ القراءة…
                </>
              ) : (
                "اختيار ملف ZIP"
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                // reset so picking the same file again still triggers
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[12.5px] text-danger"
        >
          {error}
        </div>
      )}

      {project && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] text-ink-500">الأرشيف</p>
              <p className="ltr allow-select truncate text-start font-mono text-[13px] text-ink-900">
                {fileName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-ink-600">
              <span>
                <span className="font-medium text-ink-800">{project.fileCount}</span> ملف
              </span>
              <span className="text-ink-300" aria-hidden="true">·</span>
              <span>
                <span className="font-medium text-ink-800">{project.dirCount}</span> مجلد
              </span>
              <span className="text-ink-300" aria-hidden="true">·</span>
              <span>
                <span className="font-medium text-ink-800">{humanSize(project.totalSize)}</span> الإجمالي
              </span>
              <button
                type="button"
                className="btn btn-ghost press"
                onClick={onClear}
                aria-label="إزالة ZIP والبدء من جديد"
              >
                استبدال ZIP
              </button>
            </div>
          </div>

          {project.warnings.length > 0 && (
            <div
              role="status"
              className="mt-3 rounded-md border border-warn/30 bg-warn-subtle px-3 py-2 text-[12.5px] text-warn"
            >
              <p className="font-medium">تنبيه</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-5">
                {project.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card-divider mt-3 pt-3">
            <p className="eyebrow mb-2">شجرة الملفات</p>
            <FileTree files={project.files.map((f) => f.path)} />
          </div>
        </div>
      )}
    </div>
  );
}

function FileTree({ files }: { files: string[] }) {
  // Show all top-level items. If a directory has children, show its first child indented.
  // The goal is a calm, scannable preview — not a deep collapsible tree.
  const rows = buildTreeRows(files);
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border border-ink-100 bg-white">
      {rows.map((r, i) => (
        <div
          key={i}
          className="tree-row no-select"
          style={{ paddingInlineStart: 8 + r.depth * 16 }}
        >
          <span aria-hidden="true" className="text-ink-400">
            {r.isDir ? <IconFolder width={14} height={14} /> : <IconFile width={14} height={14} />}
          </span>
          <span className="allow-select truncate">{r.name}</span>
          <span className="text-[11.5px] text-ink-400">{r.kind}</span>
        </div>
      ))}
    </div>
  );
}

interface TreeRow {
  name: string;
  depth: number;
  isDir: boolean;
  kind: string;
}

function buildTreeRows(paths: string[]): TreeRow[] {
  // Build a sorted structure of top-level entries plus a few levels of children.
  const out: TreeRow[] = [];
  const sorted = [...paths].sort();
  const topLevel = new Set<string>();
  for (const p of sorted) {
    const head = p.split("/")[0];
    if (head) topLevel.add(head);
  }
  // Group children by top-level dir
  const childrenByTop = new Map<string, string[]>();
  for (const p of sorted) {
    const parts = p.split("/");
    if (parts.length < 2) continue;
    const head = parts[0];
    const rest = parts.slice(1).join("/");
    if (!childrenByTop.has(head)) childrenByTop.set(head, []);
    childrenByTop.get(head)!.push(rest);
  }

  const topSorted = Array.from(topLevel).sort();
  const topIsDir = (name: string) =>
    sorted.some((p) => p === name || p.startsWith(name + "/"));

  for (const head of topSorted) {
    const isDir = topIsDir(head);
    out.push({ name: head, depth: 0, isDir, kind: isDir ? "مجلد" : "ملف" });
    if (isDir) {
      const children = childrenByTop.get(head) || [];
      for (const child of children.slice(0, 8)) {
        const cIsDir = sorted.some(
          (p) => p.startsWith(`${head}/${child}`) && p !== `${head}/${child}`,
        );
        out.push({
          name: child,
          depth: 1,
          isDir: cIsDir,
          kind: cIsDir ? "مجلد" : "ملف",
        });
      }
      if (children.length > 8) {
        out.push({
          name: `… ${children.length - 8} أخرى`,
          depth: 1,
          isDir: false,
          kind: "المزيد",
        });
      }
    }
  }
  return out;
}
