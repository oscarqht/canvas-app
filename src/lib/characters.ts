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
  getRootCollections,
  getChildCollections,
  getRaindrops,
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
 * Fetches all characters from Raindrop:
 *   1. Get all root collections, find one titled "Canvas"
 *   2. Get all child collections, find one titled "Characters" whose parent is "Canvas"
 *   3. Get all image raindrops from that child collection
 *
 * Returns an empty array if the expected structure is not found.
 */
export async function fetchCharacters(): Promise<Character[]> {
  // 1. Locate the "Canvas" root collection
  const roots = await getRootCollections();
  const canvasCollection = roots.find(
    (c) => c.title.trim().toLowerCase() === "canvas"
  );
  if (!canvasCollection) return [];

  // 2. Locate the "Characters" child collection under "Canvas"
  const children = await getChildCollections();
  const charactersCollection = children.find(
    (c) =>
      c.title.trim().toLowerCase() === "characters" &&
      c.parent?.$id === canvasCollection._id
  );
  if (!charactersCollection) return [];

  // 3. Find all sub-collections under "Characters"
  const characterGroups = children.filter(
    (c) => c.parent?.$id === charactersCollection._id
  );

  // 4. Batch fetch all items across all sub-collections using a single search query on collection 0
  const groupIds = characterGroups.map((g) => g._id);
  const searchFilter = JSON.stringify([{ collection: charactersCollection._id }, ...groupIds.map((id) => ({ collection: id }))]);
  const items = await getRaindrops(0, searchFilter);

  // Filter to image-type items only, map to Character shape, and sort alphabetically
  return items
    .filter((item) => item.type === "image")
    .map(toCharacter)
    .sort((a, b) => a.name.localeCompare(b.name));
}
