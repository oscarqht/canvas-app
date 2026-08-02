/**
 * Character fetching logic.
 *
 * Navigates the Raindrop collection hierarchy:
 *   Root collection "Canvas"  →  child collection "Characters"
 * Then returns all image raindrops from that child collection mapped
 * to the Character shape consumed by the UI.
 *
 * Field mapping from Raindrop → Character:
 *   cover    → image (preview)
 *   title    → character name
 *   excerpt  → character prompt
 *   note     → comma-separated matching patterns
 */

import {
  getCanvasBootstrap,
  type RaindropItem,
} from "./raindrop";
import { STORAGE_KEYS } from "./auth";

export interface Character {
  id: number;
  name: string;
  prompt: string;
  patterns: string[];
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// LocalStorage Cache Helpers
// ---------------------------------------------------------------------------

export function getCachedCharacters(): Character[] | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS_CACHE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCachedCharacters(characters: Character[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.CHARACTERS_CACHE, JSON.stringify(characters));
  } catch (e) {
    console.error("Failed to save characters cache to localStorage", e);
  }
}

export function clearCachedCharacters(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.CHARACTERS_CACHE);
}

/**
 * Maps a raw Raindrop item to a Character.
 * Patterns are parsed from the `note` field as comma-separated values.
 */
function toCharacter(item: RaindropItem): Character {
  const patterns = item.note
    ? item.note
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Prefer the cover thumbnail; fall back to the first media link
  const imageUrl =
    item.cover ||
    item.media?.find((m) => m.type === "image")?.link ||
    "";

  return {
    id: item._id,
    name: item.title,
    prompt: item.excerpt ?? "",
    patterns,
    imageUrl,
  };
}

/**
 * Fetches all characters from the shared Canvas bootstrap response.
 *
 * Returns an empty array if the expected structure is not found.
 */
export async function fetchCharacters(): Promise<Character[]> {
  const bootstrap = await getCanvasBootstrap();
  if (!bootstrap) return [];

  // Locate the "Characters" child collection under "Canvas".
  const charactersCollection = bootstrap.children.find(
    (c) =>
      c.title.trim().toLowerCase() === "characters" &&
      c.parent?.$id === bootstrap.canvas._id
  );
  if (!charactersCollection) return [];

  return bootstrap.items
    .filter(
      (item) =>
        item.collection?.$id === charactersCollection._id && item.type === "image"
    )
    .map(toCharacter)
    .sort((a, b) => a.name.localeCompare(b.name));
}
