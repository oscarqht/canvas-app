import { getRootCollections, getRaindrops, updateRaindrop, deleteRaindrop, createRaindrop } from "./raindrop";
import { getValidAccessToken } from "./auth";

export interface HistoryEntry {
  id: string;
  name: string;
  selectedCharacterIds: number[];
  selectedStyleId: number | null;
  instruction: string;
  aspectRatio: string;
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  try {
    const roots = await getRootCollections();
    const canvas = roots.find((c) => c.title.trim().toLowerCase() === "canvas");
    if (!canvas) return [];

    const items = await getRaindrops(canvas._id);
    const presetItem = items.find((i) => i.title === "data.txt");

    if (!presetItem) return [];

    if (!presetItem.excerpt) return [];

    const data = JSON.parse(presetItem.excerpt);
    return data.history || [];
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return [];
  }
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  const roots = await getRootCollections();
  const canvas = roots.find((c) => c.title.trim().toLowerCase() === "canvas");
  if (!canvas) throw new Error("Could not find Canvas root collection.");

  const items = await getRaindrops(canvas._id);
  const oldHistoryEntryItems = items.filter((i) => i.title === "data.txt");

  // Only keep 20 most recent history
  const historyToSave = history.slice(0, 20);

  const jsonStr = JSON.stringify({ history: historyToSave });

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
