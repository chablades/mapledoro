import { NextRequest, NextResponse } from "next/server";
import { TRUSTED_IMAGE_HOSTS } from "@/lib/trustedImageHosts";

// Same-origin proxy for the game-art hosts the PNG card export rasterizes -- none of
// them send Access-Control-Allow-Origin, so drawing them straight into a canvas taints
// it. Only consumed by the export capture path; live <img>/next/image usage elsewhere
// hits these hosts directly and is untouched. The hostname allowlist is load-bearing:
// without it this would be an open proxy (SSRF).
const ONE_MONTH_SECONDS = 2678400;

// 1x1 transparent PNG -- returned on upstream failure so a missing icon just renders
// blank in the captured card instead of failing the whole export.
const TRANSPARENT_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function transparentPixelResponse(): NextResponse {
  return new NextResponse(TRANSPARENT_PIXEL_PNG, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
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
  if (upstreamUrl.protocol !== "https:" || !TRUSTED_IMAGE_HOSTS.includes(upstreamUrl.hostname as (typeof TRUSTED_IMAGE_HOSTS)[number])) {
    return NextResponse.json({ error: "Untrusted host" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { next: { revalidate: ONE_MONTH_SECONDS } });
  } catch {
    return transparentPixelResponse();
  }
  if (!upstream.ok || !upstream.body) return transparentPixelResponse();

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": `public, max-age=${ONE_MONTH_SECONDS}, immutable`,
    },
  });
}
