import { NextRequest, NextResponse } from "next/server";

const RAINDROP_TOKEN_URL = process.env.RAINDROP_TOKEN_URL || "https://raindrop.io/oauth/access_token";

/**
 * POST /api/auth/refresh
 *
 * Refreshes an expired access token using a refresh token.
 * The client_secret is never exposed to the browser.
 *
 * Body: { refresh_token: string }
 * Returns: TokenData (access_token, refresh_token, expires_in, token_type)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body as { refresh_token?: string };

    if (!refresh_token || typeof refresh_token !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid refresh_token" },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_RAINDROP_CLIENT_ID || process.env.RAINDROP_CLIENT_ID;
    const clientSecret = process.env.RAINDROP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Raindrop OAuth environment variables");
      return NextResponse.json(
        { error: "Server misconfiguration: missing OAuth credentials" },
        { status: 500 }
      );
    }

    const raindropRes = await fetch(RAINDROP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token,
      }),
    });

    const data = await raindropRes.json();

    if (!raindropRes.ok) {
      console.error("Raindrop token refresh error:", data);
      return NextResponse.json(
        { error: data.error ?? "Token refresh failed" },
        { status: raindropRes.status }
      );
    }

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (err) {
    console.error("Unexpected error in /api/auth/refresh:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
