/**
 * Content-type detection from the bytes themselves, plus the upload size limits.
 *
 * The upload route used to trust the client's `mime` field: it was checked
 * against a per-purpose allow-list, stored on the row, and later echoed back as
 * the response Content-Type. Nothing ever looked at the file. A Windows
 * executable, an HTML page or a script-bearing SVG could be uploaded as
 * "image/png" and served from the API origin under that type.
 *
 * Detection here is deliberately a small closed allow-list rather than a general
 * sniffing library. Anything not positively identified as one of these five
 * formats is rejected — an unknown file is not a file this product needs to
 * accept, and "unrecognised" must never fall through to "probably fine".
 */

export type DetectedType = "image/png" | "image/jpeg" | "image/gif" | "image/webp" | "application/pdf";

const startsWith = (buf: Buffer, sig: number[], offset = 0): boolean => {
  if (buf.length < offset + sig.length) return false;
  return sig.every((byte, i) => buf[offset + i] === byte);
};

const ascii = (buf: Buffer, text: string, offset = 0): boolean =>
  startsWith(buf, [...text].map((c) => c.charCodeAt(0)), offset);

/**
 * The real type of `buf`, or null if it is not one of the accepted formats.
 *
 * Note there is no SVG here, on purpose. SVG is XML that can carry <script>,
 * so it is an executable document wearing an image's file extension. The
 * product has no need for user-supplied SVG.
 */
export function sniffFileType(buf: Buffer): DetectedType | null {
  if (buf.length < 4) return null;

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // JPEG — FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // GIF — "GIF87a" / "GIF89a"
  if (ascii(buf, "GIF87a") || ascii(buf, "GIF89a")) return "image/gif";

  // WEBP — "RIFF" ???? "WEBP"
  if (ascii(buf, "RIFF") && ascii(buf, "WEBP", 8)) return "image/webp";

  // PDF — "%PDF-"
  if (ascii(buf, "%PDF-")) return "application/pdf";

  return null;
}

/** Largest single upload. Matches the 12mb express.json limit once base64 inflates it. */
export const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Total stored bytes one account may hold.
 *
 * Sized for the real job: a handful of identity and financial documents, a
 * profile photo, and photos for a listing or two. 50 MB is generous for that
 * and still bounds what a single account can cost. Before this existed the only
 * ceiling was the global IP rate limit — roughly 9.6 GB of writes per window.
 */
export const PER_USER_QUOTA_BYTES = 50 * 1024 * 1024;

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} bytes`;
}
