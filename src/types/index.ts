export type AuthState =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "authenticated"; username: string; token: string }
  | { status: "error"; message: string };

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  html_url: string;
  updated_at: string | null;
  owner?: { login: string };
  permissions?: { push?: boolean; admin?: boolean };
}

export interface ZipEntry {
  path: string;
  name: string;
  isDir: boolean;
  size: number; // uncompressed, 0 for dirs
}

export type UploadPhase =
  | "idle"
  | "verifying"
  | "authenticated"
  | "reading"
  | "unzipping"
  | "connecting"
  | "creating-repo"
  | "deleting-files"
  | "uploading-files"
  | "done"
  | "error";

export interface UploadLogEntry {
  id: number;
  text: string;
  phase: UploadPhase;
  kind: "info" | "success" | "warn" | "error";
}
