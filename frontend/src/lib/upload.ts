import { authFetch } from "./auth";

export type UploadPurpose = "avatar" | "housing" | "verification" | "document";

export type UploadResult = { url: string; key: string };

// Must match MAX_BYTES in backend/src/routes/uploads.ts. Checked before reading
// the file so a large pick fails instantly instead of after a slow base64
// encode + upload round-trip on a poor connection.
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Upload a File to the backend (base64 JSON). Returns the stored URL + key.
 * Usage:
 *   const { url } = await uploadFile(file, "avatar");
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<UploadResult> {
  if (file.size > MAX_BYTES) {
    throw new Error("File too large (max 8MB)");
  }
  const data = await fileToBase64(file);
  const res = await authFetch("/api/uploads", {
    method: "POST",
    body: JSON.stringify({ purpose, filename: file.name, mime: file.type, data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
  return { url: json.url as string, key: json.key as string };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
