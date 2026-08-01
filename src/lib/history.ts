import { getRootCollections, getRaindrops, uploadRaindropFile, updateRaindrop, deleteRaindrop, RaindropItem } from "./raindrop";
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

    const fileUrl = presetItem.link;
    // Raindrop file links are typically signed URLs (e.g. S3), adding Authorization header causes AWS to return 400.
    // Since directly fetching S3 might trigger CORS errors on the frontend, we use our own proxy route.
    const res = await fetch(`/api/proxy-file?url=${encodeURIComponent(fileUrl)}`);

    if (!res.ok) return [];

    const text = await res.text();
    const data = JSON.parse(text);
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

  const jsonStr = JSON.stringify({ history: historyToSave }, null, 2);
  const blob = new Blob([jsonStr], { type: "text/plain" });

  const uploadedItem = await uploadRaindropFile(canvas._id, blob, "data.txt");
  if (!uploadedItem) {
    throw new Error("Failed to upload history file.");
  }

  await updateRaindrop(uploadedItem._id, { title: "data.txt" });

  for (const item of oldHistoryEntryItems) {
    await deleteRaindrop(item._id);
  }
}
