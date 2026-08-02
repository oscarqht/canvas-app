import { getRootCollections, getRaindrops, updateRaindrop, deleteRaindrop, createRaindrop } from "./raindrop";

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

export async function fetchAppData(): Promise<AppData> {
  try {
    const roots = await getRootCollections();
    const canvas = roots.find((c) => c.title.trim().toLowerCase() === "canvas");
    if (!canvas) return { history: [], presets: [] };

    const items = await getRaindrops(canvas._id);
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
  const data = await fetchAppData();
  await saveAppData({ ...data, history: history.slice(0, 20) });
}

export async function savePresets(presets: HistoryEntry[]): Promise<void> {
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
