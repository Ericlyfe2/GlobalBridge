/**
 * Safe serialisation of JSON-LD for embedding in a <script> tag.
 *
 * `JSON.stringify` is not safe to drop into HTML. It does not escape `<`, so a
 * string containing `</script>` closes the block early and everything after it
 * is parsed as markup:
 *
 *   JSON.stringify({ name: "</scr" + "ipt><img src=x onerror=alert(1)>" })
 *
 * Until the write-time sanitize() was removed, that was accidentally
 * neutralised — sanitize escaped `<`, `>` and `/` in every stored string, so
 * nothing could reach this sink intact. Removing the corruption at the source
 * (GB-01) means this boundary now has to defend itself, which is where the
 * escaping belonged all along.
 *
 * Currently reachable data is developer-authored (success_stories has no write
 * path in the API; breadcrumb labels are literals), so this is hardening rather
 * than an open hole. It is applied anyway: Breadcrumbs is a general-purpose
 * component, and the next caller to pass a listing title or a job title through
 * it should not have to know this rule.
 *
 * Escapes the three characters that can break out of a script context, plus the
 * two line separators that are valid in JSON but terminate a JS string literal.
 * The output remains valid JSON — these are JSON unicode escapes, so parsers
 * and search-engine crawlers read the original characters back.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
