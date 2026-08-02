/**
 * Style pack fetching logic.
 *
 * Navigates the Raindrop collection hierarchy:
 *   Root collection "Canvas"  →  child collection "Styles"  →  child collections (style packs)
 *
 * Each style pack collection contains image raindrops:
 *   preview.jpg  → thumbnail (cover), style prompt (excerpt), extra instruction (note)
 *   reference-N* → style reference images (cover / media links)
 */

import {
  getCanvasBootstrap,
  type RaindropItem,
} from "./raindrop";
import { STORAGE_KEYS } from "./auth";

export interface StylePack {
  id: number;
  name: string;
  /** Preview thumbnail URL (from the cover of the "preview.jpg" item) */
  previewUrl: string;
  /** Style prompt extracted from the excerpt of the "preview.jpg" item */
  stylePrompt: string;
  /** Extra style instruction extracted from the note of the "preview.jpg" item */
  extraInstruction: string;
  /** Reference image URLs from items named "reference-<N><ext>" */
  referenceImages: string[];
}

// ---------------------------------------------------------------------------
// LocalStorage Cache Helpers
// ---------------------------------------------------------------------------

export function getCachedStylePacks(): StylePack[] | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STYLES_CACHE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCachedStylePacks(styles: StylePack[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.STYLES_CACHE, JSON.stringify(styles));
  } catch (e) {
    console.error("Failed to save styles cache to localStorage", e);
  }
}

export function clearCachedStylePacks(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.STYLES_CACHE);
}

/** Returns the best available image URL for a raindrop item. */
function itemImageUrl(item: RaindropItem): string {
  return (
    item.cover ||
    item.media?.find((m) => m.type === "image")?.link ||
    ""
  );
}

/**
 * Checks whether a raindrop title matches the "preview.jpg" convention
 * (case-insensitive, with or without leading path segments).
 */
function isPreview(title: string): boolean {
  return title.trim().toLowerCase().replace(/^.*\//, "") === "preview.jpg";
}

/**
 * Checks whether a raindrop title matches the "reference-<N><ext>" convention.
 * e.g. "reference-1.jpg", "reference-2.png"
 */
function isReference(title: string): boolean {
  return /^reference-\d+(\.\w+)?$/i.test(title.trim().replace(/^.*\//, ""));
}

/**
 * Maps raw raindrops from a style pack collection into a StylePack.
 */
function toStylePack(
  collectionId: number,
  collectionTitle: string,
  items: RaindropItem[]
): StylePack {
  const previewItem = items.find((item) => isPreview(item.title));
  const referenceItems = items
    .filter((item) => isReference(item.title))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

  return {
    id: collectionId,
    name: collectionTitle,
    previewUrl: previewItem ? itemImageUrl(previewItem) : "",
    stylePrompt: previewItem?.excerpt ?? "",
    extraInstruction: previewItem?.note ?? "",
    referenceImages: referenceItems.map(itemImageUrl).filter(Boolean),
  };
}

/**
 * Fetches all style packs from the shared Canvas bootstrap response.
 *
 * Returns an empty array if the expected structure is not found.
 */
export async function fetchStylePacks(): Promise<StylePack[]> {
  const bootstrap = await getCanvasBootstrap();
  if (!bootstrap) return [];

  const stylesCollection = bootstrap.children.find(
    (c) =>
      c.title.trim().toLowerCase() === "styles" &&
      c.parent?.$id === bootstrap.canvas._id
  );
  if (!stylesCollection) return [];

  const stylePackCollections = bootstrap.children.filter(
    (c) => c.parent?.$id === stylesCollection._id
  );

  const packs = stylePackCollections.map((col) =>
    toStylePack(
      col._id,
      col.title,
      bootstrap.items.filter((item) => item.collection?.$id === col._id)
    )
  );

  // Reverse the order of packs to match reverse Raindrop API response
  return packs.reverse();
}
