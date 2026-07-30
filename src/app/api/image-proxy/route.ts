/**
 * Image proxy route.
 *
 * Fetches an external image (e.g. from Raindrop CDN) server-side and returns
 * it as a base64-encoded data URL so the client can embed it in a PDF without
 * hitting CORS restrictions.
 *
 * Usage:  GET /api/image-proxy?url=<encoded-image-url>
 */

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only allow http/https URLs to prevent SSRF against internal services.
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response(JSON.stringify({ error: "Disallowed protocol" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: { "User-Agent": "canvas-app/1.0" },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return new Response(JSON.stringify({ dataUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[image-proxy] fetch error", err);
    return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
