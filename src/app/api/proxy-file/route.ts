import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Security: prevent SSRF by checking domain allowlist
  try {
    const parsedUrl = new URL(url);
    const allowedDomains = ["api.raindrop.io", "up.raindrop.io", "amazonaws.com", "s3.amazonaws.com"];
    const isAllowed = allowedDomains.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain));
    if (!isAllowed) {
      return NextResponse.json({ error: "Invalid URL domain" }, { status: 403 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/plain",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Proxy error: ${error.message}` },
      { status: 500 }
    );
  }
}
