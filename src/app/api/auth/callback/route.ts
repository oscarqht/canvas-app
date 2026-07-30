import { NextRequest, NextResponse } from "next/server";

const RAINDROP_TOKEN_URL = "https://raindrop.io/oauth/access_token";

/**
 * POST /api/auth/callback
 *
 * Receives the authorization code from the client and exchanges it for
 * access + refresh tokens using the server-side client secret.
 *
 * Body: { code: string }
 * Returns: TokenData (access_token, refresh_token, expires_in, token_type)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid authorization code" },
        { status: 400 }
      );
    }

    const clientId = process.env.RAINDROP_CLIENT_ID;
    const clientSecret = process.env.RAINDROP_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_RAINDROP_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
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
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const data = await raindropRes.json();

    if (!raindropRes.ok) {
      console.error("Raindrop token exchange error:", data);
      return NextResponse.json(
        { error: data.error ?? "Token exchange failed" },
        { status: raindropRes.status }
      );
    }

    // Return only the fields the client needs — never log/expose client_secret
    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (err) {
    console.error("Unexpected error in /api/auth/callback:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
