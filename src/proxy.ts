import { NextResponse, type NextRequest } from "next/server";

const MAINTENANCE_PATH = "/maintenance";

/** Paths that must keep working while the site is down: the API, Next's build
 *  output, and any file-extension request (/icons/doro.png, /favicon.ico, the
 *  public/ trees) that the maintenance page itself needs to render. */
function isExempt(pathname: string) {
  return (
    pathname === MAINTENANCE_PATH ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  );
}

export function proxy(request: NextRequest) {
  // Off by default. Set MAINTENANCE_MODE=1 in the host's environment to take the
  // site down; remove it to bring the site back.
  if (process.env.MAINTENANCE_MODE !== "1") return NextResponse.next();

  if (isExempt(request.nextUrl.pathname)) return NextResponse.next();

  // Rewrite rather than redirect, so the visitor keeps the URL they asked for and
  // a bookmarked tool page works again the moment maintenance ends.
  return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url));
}
