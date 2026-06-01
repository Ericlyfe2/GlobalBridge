import { authFetch } from "./auth";

export type UploadPurpose = "avatar" | "housing" | "verification" | "document";

export type UploadResult = { url: string; key: string };

/**
 * Upload a File to the backend (base64 JSON). Returns the stored URL + key.
 * Usage:
 *   const { url } = await uploadFile(file, "avatar");
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<UploadResult> {
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
