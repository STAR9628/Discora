/**
 * Success response for the OAuth callback route.
 *
 * Background: the route's success redirect (`307 Location: <destination>`)
 * has its incoming OAuth query string preserved onto the Location by the
 * Netlify redirect layer, so the browser lands on `/?code=...`. The
 * destination calculation itself is correct.
 *
 * Fix strategy: return HTTP 200 HTML that navigates to the already-validated
 * destination instead of issuing any 3xx. The destination MUST already be
 * validated (relative, allow-listed, residue-stripped) by the caller —
 * this builder performs escaping only, never validation.
 *
 * Security properties:
 * - The OAuth `code` is never accepted as input and never appears in output.
 * - The destination is HTML-escaped for both attribute and text contexts.
 * - No `eval`, no dynamic script content, no external resources.
 * - Navigation is a `<meta http-equiv="refresh">` plus an accessible
 *   fallback link, so no JavaScript (and no CSP interaction) is required.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildCallbackSuccessHtml(destination: string): string {
  const safe = escapeHtml(destination);
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    `<meta http-equiv="refresh" content="0;url=${safe}">\n` +
    "<title>Completing sign in</title>\n" +
    "<style>body{margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif}p{margin:.5rem 0;font-size:.875rem}a{color:#3b82f6}</style>\n" +
    "</head>\n" +
    "<body>\n" +
    "<main>\n" +
    "<p>Completing sign in&hellip;</p>\n" +
    `<p><a href="${safe}">Continue</a></p>\n` +
    "</main>\n" +
    "</body>\n" +
    "</html>\n"
  );
}
