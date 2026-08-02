import {
  createRaindrop,
  deleteRaindrop,
  getCanvasBootstrap,
  getRaindrops,
  getRootCollections,
  updateRaindrop,
} from "./raindrop";

export interface HistoryEntry {
  id: string;
  name: string;
  selectedCharacterIds: number[];
  selectedStyleId: number | null;
  instruction: string;
  aspectRatio: string;
}

export interface AppData {
  history: HistoryEntry[];
  presets: HistoryEntry[];
}

const STORAGE_KEYS = {
  HISTORY_CACHE: "draw_context_history_cache",
  PRESETS_CACHE: "draw_context_presets_cache",
};

export function getCachedHistory(): HistoryEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY_CACHE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCachedHistory(history: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY_CACHE, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to cache history:", error);
  }
}

export function getCachedPresets(): HistoryEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRESETS_CACHE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCachedPresets(presets: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PRESETS_CACHE, JSON.stringify(presets));
  } catch (error) {
    console.error("Failed to cache presets:", error);
  }
}

export async function fetchAppData(): Promise<AppData> {
  try {
    const bootstrap = await getCanvasBootstrap();
    if (!bootstrap) return { history: [], presets: [] };

    const items = bootstrap.items.filter(
      (item) => item.collection?.$id === bootstrap.canvas._id
    );
    const presetItem = items.find((i) => i.title === "data.txt");

    if (!presetItem || !presetItem.excerpt) return { history: [], presets: [] };

    const data = JSON.parse(presetItem.excerpt);
    return {
      history: data.history || [],
      presets: data.presets || []
    };
  } catch (error) {
    console.error("Failed to fetch app data:", error);
    return { history: [], presets: [] };
  }
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const data = await fetchAppData();
  return data.history;
}

export async function fetchPresets(): Promise<HistoryEntry[]> {
  const data = await fetchAppData();
  return data.presets;
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  const newHistory = history.slice(0, 20);
  setCachedHistory(newHistory);
  const data = await fetchAppData();
  await saveAppData({ ...data, history: newHistory });
}

export async function savePresets(presets: HistoryEntry[]): Promise<void> {
  setCachedPresets(presets);
  const data = await fetchAppData();
  await saveAppData({ ...data, presets });
}

async function saveAppData(data: AppData): Promise<void> {
  const roots = await getRootCollections();
  const canvas = roots.find((c) => c.title.trim().toLowerCase() === "canvas");
  if (!canvas) throw new Error("Could not find Canvas root collection.");

  const items = await getRaindrops(canvas._id);
  const oldHistoryEntryItems = items.filter((i) => i.title === "data.txt");

  const jsonStr = JSON.stringify(data);

  if (oldHistoryEntryItems.length > 0) {
    // Update the first existing item and delete duplicates
    const itemToUpdate = oldHistoryEntryItems[0];
    await updateRaindrop(itemToUpdate._id, { excerpt: jsonStr });

    for (let i = 1; i < oldHistoryEntryItems.length; i++) {
      await deleteRaindrop(oldHistoryEntryItems[i]._id);
    }
  } else {
    // Create a new item
    await createRaindrop({
      title: "data.txt",
      link: "https://example.com/data.txt", // Raindrop requires a link for non-file items
      excerpt: jsonStr,
      collection: { $id: canvas._id },
    });
  }
}
