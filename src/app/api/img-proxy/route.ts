import { NextRequest, NextResponse } from "next/server";
import { TRUSTED_IMAGE_HOSTS } from "@/lib/trustedImageHosts";

// Same-origin proxy for the game-art hosts the character card export draws onto a canvas. None
// of them send Access-Control-Allow-Origin, so drawing them directly would taint the canvas and
// block the PNG download. Normal <img> and next/image use elsewhere still hit the hosts directly.
// The host allowlist, the refusal to follow redirects, and the image-only content type are what
// keep this from being an open proxy.
const ONE_MONTH_SECONDS = 2678400;

// 1x1 transparent PNG, returned when the upstream fails so a missing image renders blank on the
// card instead of failing the whole export.
const TRANSPARENT_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function transparentPixel(): NextResponse {
  return new NextResponse(TRANSPARENT_PIXEL_PNG, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}

function isTrustedUrl(url: URL): boolean {
  return url.protocol === "https:" && (TRUSTED_IMAGE_HOSTS as readonly string[]).includes(url.hostname);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!isTrustedUrl(upstreamUrl)) return NextResponse.json({ error: "Untrusted host" }, { status: 400 });

  let upstream: Response;
  try {
    // A redirect could point anywhere, so it counts as a failure rather than being followed.
    upstream = await fetch(upstreamUrl, { redirect: "error", next: { revalidate: ONE_MONTH_SECONDS } });
  } catch {
    return transparentPixel();
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !contentType.startsWith("image/")) return transparentPixel();

  return new NextResponse(upstream.body, {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": `public, max-age=${ONE_MONTH_SECONDS}, immutable` },
  });
}
