// All GitHub REST calls live here. They run in the browser context, sending
// the user's PAT in the Authorization header. The PAT never leaves the page
// and is never written to storage.

import type { Repo } from "@/types";

const API = "https://api.github.com";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export class GitHubError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.body = body;
  }
}

export async function verifyCredentials(
  username: string,
  token: string,
): Promise<{ login: string }> {
  const res = await fetch(`${API}/user`, { headers: authHeaders(token) });
  if (!res.ok) {
    const body = await safeJson(res);
    if (res.status === 401) {
      throw new GitHubError(
        "الرمز غير صالح أو منتهي الصلاحية أو تم إبطاله. أنشئ رمزًا جديدًا وحاول مرة أخرى.",
        401,
        body,
      );
    }
    if (res.status === 403) {
      throw new GitHubError(
        "رفض GitHub الطلب. قد يفتقر الرمز إلى الصلاحيات المطلوبة، أو تم بلوغ الحد الأقصى للطلبات.",
        403,
        body,
      );
    }
    throw new GitHubError(
      `تعذّر التحقق من بيانات الاعتماد (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { login: string };
  if (data.login.toLowerCase() !== username.trim().toLowerCase()) {
    throw new GitHubError(
      `اسم المستخدم لا يطابق الحساب المالك لهذا الرمز. الرمز يخص "${data.login}".`,
      409,
    );
  }
  return data;
}

export async function listRepos(token: string): Promise<Repo[]> {
  const out: Repo[] = [];
  let page = 1;
  // Paginate to make sure org repos and personal repos both come through.
  // The default `affiliation=owner,collaborator,organization_member` covers
  // the most common cases without exposing too much.
  while (page <= 5) {
    const url = `${API}/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`;
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) {
      const body = await safeJson(res);
      throw new GitHubError(
        res.status === 401
          ? "لم يعد الرمز صالحًا. الرجاء إعادة تسجيل الدخول."
          : `تعذّر تحميل المستودعات (HTTP ${res.status}).`,
        res.status,
        body,
      );
    }
    const batch = (await res.json()) as Repo[];
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}

export async function getRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<Repo> {
  const res = await fetch(`${API}/repos/${owner}/${repo}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    if (res.status === 404) {
      throw new GitHubError(
        `لم يتم العثور على المستودع ${owner}/${repo}، أو لا يملك الرمز صلاحية الوصول إليه.`,
        404,
        body,
      );
    }
    if (res.status === 401) {
      throw new GitHubError("الرمز غير صالح أو منتهي الصلاحية.", 401, body);
    }
    throw new GitHubError(
      `تعذّر تحميل المستودع (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  return (await res.json()) as Repo;
}

export async function createRepo(
  token: string,
  params: {
    name: string;
    description?: string;
    isPrivate: boolean;
    autoInit: boolean;
  },
): Promise<Repo> {
  const res = await fetch(`${API}/user/repos`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      description: params.description || undefined,
      private: params.isPrivate,
      auto_init: params.autoInit,
    }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    if (res.status === 422) {
      const msg = extractMessage(body) || "يوجد مستودع بهذا الاسم بالفعل.";
      throw new GitHubError(msg, 422, body);
    }
    if (res.status === 401) {
      throw new GitHubError("الرمز غير صالح أو منتهي الصلاحية.", 401, body);
    }
    if (res.status === 403) {
      throw new GitHubError(
        "لا يملك الرمز صلاحية إنشاء المستودعات. أنشئ رمزًا جديدًا بنطاق 'repo'.",
        403,
        body,
      );
    }
    throw new GitHubError(
      `تعذّر إنشاء المستودع (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  return (await res.json()) as Repo;
}

export async function getBranchSha(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّرت قراءة الفرع الافتراضي (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { object: { sha: string } };
  return data.object.sha;
}

export interface TreeEntry {
  path: string;
  sha: string;
  mode?: "100644" | "100755" | "040000";
}

export interface RemoteFile {
  path: string;
  sha: string;
}

export async function listRepoFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<RemoteFile[]> {
  // Recursive tree; the truncated response is fine because we only need paths.
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر سرد الملفات الحالية (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as {
    tree: Array<{ path: string; sha: string; type: string }>;
    truncated: boolean;
  };
  return data.tree
    .filter((t) => t.type === "blob")
    .map((t) => ({ path: t.path, sha: t.sha }));
}

export async function createBlob(
  token: string,
  owner: string,
  repo: string,
  contentBase64: string,
): Promise<string> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ content: contentBase64, encoding: "base64" }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر رفع كائن ملف (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

export async function createTree(
  token: string,
  owner: string,
  repo: string,
  entries: TreeEntry[],
  baseTreeSha?: string,
): Promise<string> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: entries.map((e) => ({
        path: e.path,
        mode: e.mode || "100644",
        type: "blob",
        sha: e.sha,
      })),
    }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر إنشاء شجرة الملفات (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

export async function createCommit(
  token: string,
  owner: string,
  repo: string,
  params: { message: string; treeSha: string; parentSha: string },
): Promise<{ sha: string; html_url: string }> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      tree: params.treeSha,
      parents: [params.parentSha],
    }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّر إنشاء الإيداع (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { sha: string; html_url: string };
  return { sha: data.sha, html_url: data.html_url };
}

export async function updateRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  newSha: string,
): Promise<void> {
  // First, get the current ref to fetch its object sha (we need it for update).
  // For most repos this is the commit sha returned by getBranchSha.
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    const body = await safeJson(res);
    throw new GitHubError(
      `تعذّرت قراءة مرجع الفرع (HTTP ${res.status}).`,
      res.status,
      body,
    );
  }
  const ref = (await res.json()) as { object: { sha: string } };
  const update = await fetch(
    `${API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newSha, force: true }),
    },
  );
  if (!update.ok) {
    const body = await safeJson(update);
    throw new GitHubError(
      `تعذّر تحديث الفرع (HTTP ${update.status}).`,
      update.status,
      body,
    );
  }
  // Touch ref to silence unused-var warnings while keeping clarity.
  void ref;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function extractMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept "owner/repo", "https://github.com/owner/repo", "git@github.com:owner/repo.git"
  const ssh = trimmed.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const https = trimmed.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/i);
  if (https) return { owner: https[1], repo: https[2] };
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  return null;
}
