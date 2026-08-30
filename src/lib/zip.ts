import JSZip from "jszip";
import type { ZipEntry } from "@/types";

const SKIP_DIRS = new Set(["__MACOSX/", ".DS_Store", "Thumbs.db"]);
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB safe ceiling for browser
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per single file

export interface ExtractedProject {
  files: { path: string; content: Uint8Array }[];
  totalSize: number;
  fileCount: number;
  dirCount: number;
  warnings: string[];
}

export async function readZipFile(file: File): Promise<JSZip> {
  if (file.size > MAX_TOTAL_BYTES) {
    throw new Error(
      `حجم أرشيف ZIP هو ${(file.size / 1024 / 1024).toFixed(1)} ميجابايت، وهو أكبر من الحد المسموح به وهو ${MAX_TOTAL_BYTES / 1024 / 1024} ميجابايت.`,
    );
  }
  return JSZip.loadAsync(file);
}

export function listEntries(zip: JSZip): ZipEntry[] {
  const out: ZipEntry[] = [];
  zip.forEach((relativePath, entry) => {
    if (SKIP_DIRS.has(relativePath) || relativePath.endsWith("/.DS_Store")) {
      return;
    }
    const isDir = entry.dir || relativePath.endsWith("/");
    if (isDir) {
      out.push({ path: relativePath.replace(/\/$/, ""), name: relativePath, isDir: true, size: 0 });
    } else {
      out.push({ path: relativePath, name: relativePath, isDir: false, size: 0 });
    }
  });
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function extractFiles(
  zip: JSZip,
  onProgress?: (current: number, total: number, name: string) => void,
): Promise<ExtractedProject> {
  const entries = listEntries(zip);
  const fileEntries = entries.filter((e) => !e.isDir);
  const dirEntries = entries.filter((e) => e.isDir);
  const warnings: string[] = [];
  const files: { path: string; content: Uint8Array }[] = [];
  let totalSize = 0;

  for (let i = 0; i < fileEntries.length; i++) {
    const e = fileEntries[i];
    onProgress?.(i, fileEntries.length, e.path);
    if (e.size > MAX_FILE_BYTES) {
      warnings.push(
        `تم تخطي ${e.path} (${(e.size / 1024 / 1024).toFixed(1)} ميجابايت يتجاوز حد الـ 50 ميجابايت لكل ملف).`,
      );
      continue;
    }
    const data = await zip.file(e.path)?.async("uint8array");
    if (!data) {
      warnings.push(`تم تخطي ${e.path} (تعذّرت قراءته).`);
      continue;
    }
    files.push({ path: e.path, content: data });
    totalSize += data.byteLength;
  }
  onProgress?.(fileEntries.length, fileEntries.length, "Done");

  return {
    files,
    totalSize,
    fileCount: fileEntries.length,
    dirCount: dirEntries.length,
    warnings,
  };
}

// Build a flat, sorted list of unique directory paths implied by the files.
// Used to render a clean tree in the UI.
export function deriveDirPaths(files: { path: string }[]): string[] {
  const dirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }
  return Array.from(dirs).sort();
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function toBase64(bytes: Uint8Array): string {
  // Use the built-in browser encoder and chunk to avoid call-stack limits on
  // very large files.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as number[],
    );
  }
  return btoa(binary);
}
