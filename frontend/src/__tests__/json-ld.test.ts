/**
 * Regression guard for the JSON-LD script-injection sink (GB-01 follow-on).
 *
 * Removing the write-time sanitize() was correct, but it was also — by accident
 * — the only thing stopping a `</script>` in stored text from breaking out of
 * the JSON-LD blocks in JsonLd.tsx and Breadcrumbs.tsx. The escaping now lives
 * at the render boundary where it belongs, and this pins it there.
 */

import { describe, it, expect } from "vitest";
import { safeJsonLd } from "@/lib/json-ld";

const CLOSE_TAG = "</scr" + "ipt>";

describe("safeJsonLd", () => {
  it("neutralises a closing script tag", () => {
    const out = safeJsonLd({ name: `${CLOSE_TAG}<img src=x onerror=alert(1)>` });
    expect(out).not.toContain(CLOSE_TAG);
    expect(out).not.toContain("<img");
    expect(out).toContain("\\u003c");
  });

  it("escapes every character that can break a script context", () => {
    const out = safeJsonLd({ v: "<>&" });
    expect(out).not.toMatch(/[<>&]/);
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    expect(out).toContain("\\u0026");
  });

  it("escapes U+2028 / U+2029, which terminate a JS string literal", () => {
    const out = safeJsonLd({ v: "a\u2028b\u2029c" });
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });

  it("still produces valid JSON that round-trips to the original value", () => {
    // Escaping must not corrupt the data — crawlers have to read the real text.
    const value = {
      name: `Ama's "story" <b>&</b> more`,
      url: "https://globalbridge.app/stories/1",
      sep: "a\u2028b",
    };
    expect(JSON.parse(safeJsonLd(value))).toEqual(value);
  });

  it("leaves ordinary content untouched once parsed", () => {
    const value = { "@type": "BreadcrumbList", name: "Success Stories" };
    expect(JSON.parse(safeJsonLd(value))).toEqual(value);
  });
});
