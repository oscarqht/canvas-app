/**
 * Raindrop.io OAuth token storage and management utilities.
 * Tokens are stored in localStorage for persistence across page reloads.
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "raindrop_access_token",
  REFRESH_TOKEN: "raindrop_refresh_token",
  EXPIRES_AT: "raindrop_expires_at", // Unix timestamp (ms) when access_token expires
  CHARACTERS_CACHE: "canvas_characters_cache",
  STYLES_CACHE: "canvas_styles_cache",
} as const;

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function isTokenExpired(): boolean {
  if (typeof window === "undefined") return true;
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  if (!expiresAt) return true;
  // Consider expired 60 s early to avoid edge-case failures
  return Date.now() >= Number(expiresAt) - 60_000;
}

export function isLoggedIn(): boolean {
  return !!getAccessToken() && !isTokenExpired();
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

export function storeTokens(data: TokenData): void {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.CHARACTERS_CACHE);
  localStorage.removeItem(STORAGE_KEYS.STYLES_CACHE);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  clearCache();
}

// ---------------------------------------------------------------------------
// OAuth flow helpers
// ---------------------------------------------------------------------------

/**
 * Redirect the user to Raindrop's authorization page.
 * Step 1 of the OAuth flow.
 */
export function redirectToRaindropAuth(): void {
  const clientId = process.env.NEXT_PUBLIC_RAINDROP_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_RAINDROP_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Missing NEXT_PUBLIC_RAINDROP_CLIENT_ID or NEXT_PUBLIC_RAINDROP_REDIRECT_URI in environment"
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  window.location.href = `https://raindrop.io/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens via our server-side API route.
 * Step 3 of the OAuth flow.
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenData> {
  const res = await fetch("/api/auth/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<TokenData>;
}

/**
 * Refresh the access token using the stored refresh token.
 * Stores the new tokens in localStorage.
 */
export async function refreshAccessToken(): Promise<TokenData> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token stored");

  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as TokenData;
  storeTokens(data);
  return data;
}

/**
 * Returns a valid access token, refreshing automatically if expired.
 * Use this before any Raindrop API call.
 */
export async function getValidAccessToken(): Promise<string> {
  if (!isTokenExpired()) {
    return getAccessToken()!;
  }
  const data = await refreshAccessToken();
  return data.access_token;
}
