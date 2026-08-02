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

// ---------------------------------------------------------------------------
// In-flight Request Deduplication
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inflightRequests = new Map<string, Promise<any>>();

export function withDedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export interface RaindropCollection {
  _id: number;
  title: string;
  count: number;
  cover: string[];
  parent?: { $id: number };
}

/**
 * Fetch all root-level collections for the authenticated user.
 */
export async function getRootCollections(): Promise<RaindropCollection[]> {
  return withDedupe("getRootCollections", async () => {
    const token = await getValidAccessToken();
    const res = await fetch(`${RAINDROP_API}/collections`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.result ? (data.items as RaindropCollection[]) : [];
  });
}

/**
 * Fetch all child (nested) collections for the authenticated user.
 */
export async function getChildCollections(): Promise<RaindropCollection[]> {
  return withDedupe("getChildCollections", async () => {
    const token = await getValidAccessToken();
    const res = await fetch(`${RAINDROP_API}/collections/childrens`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.result ? (data.items as RaindropCollection[]) : [];
  });
}

// ---------------------------------------------------------------------------
// Raindrops
// ---------------------------------------------------------------------------

export interface RaindropItem {
  _id: number;
  title: string;
  excerpt: string;
  note: string;
  type: string;
  cover: string;
  media: { link: string; type: string }[];
  link: string;
  tags: string[];
  collectionId: number;
}

/**
 * Fetch all raindrops from a specific collection.
 * Paginates through all pages (50 per page max).
 */
export async function getRaindrops(collectionId: number, search?: string): Promise<RaindropItem[]> {
  return withDedupe(`getRaindrops:${collectionId}:${search || ""}`, async () => {
    const token = await getValidAccessToken();
    const allItems: RaindropItem[] = [];
    let page = 0;

    while (true) {
      const url = new URL(`${RAINDROP_API}/raindrops/${collectionId}`);
      url.searchParams.set("perpage", "50");
      url.searchParams.set("page", String(page));
      if (search) {
        url.searchParams.set("search", search);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) break;
      const data = await res.json();
      if (!data.result || !Array.isArray(data.items) || data.items.length === 0) break;

      allItems.push(...(data.items as RaindropItem[]));

      // If we received fewer than 50 items, we're on the last page
      if (data.items.length < 50) break;
      page++;
    }

    return allItems;
  });
}

/**
 * Fetch the currently authenticated Raindrop user.
 * Returns null if the token is missing / invalid.
 */
export async function getAuthenticatedUser(): Promise<RaindropUser | null> {
  return withDedupe("getAuthenticatedUser", async () => {
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
  });
}

/** Gravatar URL derived from email_MD5 provided by the API */
export function gravatarUrl(email_MD5: string, size = 32): string {
  return `https://www.gravatar.com/avatar/${email_MD5}?s=${size}&d=mp`;
}

/**
 * Upload a file as a new raindrop item.
 */
export async function uploadRaindropFile(collectionId: number, file: Blob, filename: string): Promise<RaindropItem | null> {
  const token = await getValidAccessToken();
  const formData = new FormData();
  formData.append("collectionId", String(collectionId));
  formData.append("file", file, filename);

  const res = await fetch(`${RAINDROP_API}/raindrop/file`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.result ? data.item : null;
}

/**
 * Delete a raindrop item.
 */
export async function deleteRaindrop(id: number): Promise<boolean> {
  const token = await getValidAccessToken();
  const res = await fetch(`${RAINDROP_API}/raindrop/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

/**
 * Update a raindrop item.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRaindrop(id: number, updates: any): Promise<RaindropItem | null> {
  const token = await getValidAccessToken();
  const res = await fetch(`${RAINDROP_API}/raindrop/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.result ? data.item : null;
}

/**
 * Get a single raindrop item.
 */
export async function getRaindrop(id: number): Promise<RaindropItem | null> {
  return withDedupe(`getRaindrop:${id}`, async () => {
    const token = await getValidAccessToken();
    const res = await fetch(`${RAINDROP_API}/raindrop/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.result ? data.item : null;
  });
}

/**
 * Create a new raindrop item.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createRaindrop(data: any): Promise<RaindropItem | null> {
  const token = await getValidAccessToken();
  const res = await fetch(`${RAINDROP_API}/raindrop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.result ? json.item : null;
}
