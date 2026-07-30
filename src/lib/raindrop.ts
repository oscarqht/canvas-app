/**
 * Raindrop.io REST API helpers.
 * Always calls getValidAccessToken() so expired tokens are refreshed transparently.
 */

import { getValidAccessToken, clearTokens } from "./auth";

const RAINDROP_API = "https://api.raindrop.io/rest/v1";

export interface RaindropUser {
  _id: number;
  fullName: string;
  email: string;
  email_MD5: string;
  pro: boolean;
  registered: string;
}

/**
 * Fetch the currently authenticated Raindrop user.
 * Returns null if the token is missing / invalid.
 */
export async function getAuthenticatedUser(): Promise<RaindropUser | null> {
  let token: string;
  try {
    token = await getValidAccessToken();
  } catch {
    return null;
  }

  const res = await fetch(`${RAINDROP_API}/user`, {
    headers: { Authorization: `Bearer ${token}` },
    // Always fresh — user info rarely changes but we don't want stale cache
    cache: "no-store",
  });

  if (res.status === 401) {
    // Token is invalid even after refresh attempt — clear storage
    clearTokens();
    return null;
  }

  if (!res.ok) return null;

  const data = await res.json();
  return data.result ? (data.user as RaindropUser) : null;
}

/** Gravatar URL derived from email_MD5 provided by the API */
export function gravatarUrl(email_MD5: string, size = 32): string {
  return `https://www.gravatar.com/avatar/${email_MD5}?s=${size}&d=mp`;
}
