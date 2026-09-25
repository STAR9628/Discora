/**
 * Build the header Login link target for a guest on the given pathname.
 *
 * The current page is preserved as `redirectedFrom` so login returns the
 * user to their context — EXCEPT the password-recovery page, which must
 * never be a post-login destination (a normal login must not route back
 * into the recovery flow). Auth entry points need no redirect parameter.
 * Pure function safe to unit test.
 */
export function getLoginHref(pathname: string | null): string {
  if (
    !pathname ||
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/reset-password")
  ) {
    return "/login";
  }
  return `/login?redirectedFrom=${encodeURIComponent(pathname)}`;
}
