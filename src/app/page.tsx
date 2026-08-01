"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  isLoggedIn,
  clearTokens,
  redirectToRaindropAuth,
} from "@/lib/auth";
import {
  getAuthenticatedUser,
  gravatarUrl,
  getRootCollections,
  getRaindrops,
  type RaindropUser,
} from "@/lib/raindrop";
import {
  fetchCharacters,
  getCachedCharacters,
  setCachedCharacters,
  type Character,
} from "@/lib/characters";
import {
  fetchStylePacks,
  getCachedStylePacks,
  setCachedStylePacks,
  type StylePack,
} from "@/lib/styles";
import { generatePromptDocument } from "@/lib/pdf";
import { fetchHistory, saveHistory, type HistoryEntry } from "@/lib/history";

// ---------------------------------------------------------------------------
// Auth + user hook
// ---------------------------------------------------------------------------
function useRaindropAuth() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<RaindropUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      setUser(null);
      return;
    }
    setLoggedIn(true);
    setLoadingUser(true);
    try {
      const u = await getAuthenticatedUser();
      setUser(u);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    window.addEventListener("focus", fetchUser);
    return () => window.removeEventListener("focus", fetchUser);
  }, [fetchUser]);

  const login = () => redirectToRaindropAuth();

  const logout = () => {
    clearTokens();
    setLoggedIn(false);
    setUser(null);
  };

  return { loggedIn, user, loadingUser, login, logout };
}

// ---------------------------------------------------------------------------
// Characters hook
// ---------------------------------------------------------------------------
function useCharacters(loggedIn: boolean) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!loggedIn) {
      setCharacters([]);
      return;
    }

    // Load from cache immediately if present so UI renders right away
    const cached = getCachedCharacters();
    if (cached && cached.length > 0) {
      setCharacters(cached);
    }

    setLoading(true);
    setError(null);
    try {
      const chars = await fetchCharacters();
      setCharacters(chars);
      setCachedCharacters(chars);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load characters");
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  return { characters, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// Styles hook
// ---------------------------------------------------------------------------
function useStyles(loggedIn: boolean) {
  const [styles, setStyles] = useState<StylePack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!loggedIn) {
      setStyles([]);
      return;
    }

    // Load from cache immediately if present so UI renders right away
    const cached = getCachedStylePacks();
    if (cached && cached.length > 0) {
      setStyles(cached);
    }

    setLoading(true);
    setError(null);
    try {
      const packs = await fetchStylePacks();
      setStyles(packs);
      setCachedStylePacks(packs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load styles");
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  return { styles, loading, error, reload: load };
}


// ---------------------------------------------------------------------------
// Ratio options
// ---------------------------------------------------------------------------
const RATIO_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "1:1", label: "Square 1:1" },
  { value: "16:9", label: "Landscape 16:9" },
  { value: "4:3", label: "Landscape 4:3" },
  { value: "3:2", label: "Landscape 3:2" },
  { value: "3:1", label: "Landscape 3:1" },
  { value: "9:16", label: "Portrait 9:16" },
  { value: "3:4", label: "Portrait 3:4" },
  { value: "2:3", label: "Portrait 2:3" },
  { value: "1:3", label: "Portrait 1:3" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// History hook
// ---------------------------------------------------------------------------
function useHistory(loggedIn: boolean) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!loggedIn) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const fetched = await fetchHistory();
      setHistory(fetched);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { history, setHistory, loadingHistory };
}

export default function HomePage() {
  const { loggedIn, user, loadingUser, login, logout } = useRaindropAuth();
  const { characters, loading: charsLoading, error: charsError } = useCharacters(loggedIn);
  const { styles, loading: stylesLoading, error: stylesError } = useStyles(loggedIn);
  const { history, setHistory, loadingHistory } = useHistory(loggedIn);
  const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string>("");

  // Selection state
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<number>>(new Set());
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [imageGenerating, setImageGenerating] = useState(false);

  // Prompt controls
  const [instruction, setInstruction] = useState("");
  const [ratio, setRatio] = useState("auto");

  // Chip state (derived)
  const chips = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const char of characters) {
      for (const pattern of char.patterns) {
        counts[pattern] = (counts[pattern] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern);
  }, [characters]);

  // PDF generation state
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout>(null);

  const toggleCharacter = (id: number) => {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyHistoryEntry = (historyEntryId: string) => {
    setSelectedHistoryEntryId(historyEntryId);
    if (!historyEntryId) return;
    const historyEntry = history.find(p => p.id === historyEntryId);
    if (historyEntry) {
      setSelectedCharacterIds(new Set(historyEntry.selectedCharacterIds));
      setSelectedStyleId(historyEntry.selectedStyleId);
      setInstruction(historyEntry.instruction);
      setRatio(historyEntry.aspectRatio);
    }
  };

  const toggleStyle = (id: number) => {
    setSelectedStyleId((prev) => (prev === id ? null : id));
  };

  const isChipActive = (chip: string) => {
    const matchingChars = characters.filter((c) => c.patterns.includes(chip));
    if (matchingChars.length === 0) return false;
    return matchingChars.every((c) => selectedCharacterIds.has(c.id));
  };

  const toggleChip = (chip: string) => {
    const matchingChars = characters.filter((c) => c.patterns.includes(chip));
    const active = isChipActive(chip);

    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (active) {
        // Deselect all
        matchingChars.forEach((c) => next.delete(c.id));
      } else {
        // Select all
        matchingChars.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };





  const saveCurrentAsHistoryEntry = async () => {
    const newHistoryEntry: HistoryEntry = {
      id: Date.now().toString(),
      name: `History ${new Date().toLocaleString()}`,
      selectedCharacterIds: Array.from(selectedCharacterIds),
      selectedStyleId: selectedStyleId,
      instruction: instruction,
      aspectRatio: ratio,
    };

    const newHistory = [newHistoryEntry, ...history.filter(p =>
      // Basic check if exactly same historyEntry, we just overwrite by keeping it at top,
      // actually we just keep the newest one and remove older ones if we wanted to avoid duplicates,
      // but let's just prepend and slice to 20 inside saveHistory.
      true
    )].slice(0, 20);

    setHistory(newHistory);
    setSelectedHistoryEntryId(newHistoryEntry.id);

    try {
      await saveHistory(newHistory);
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  const handleGenerateImage = async () => {
    if (imageGenerating) return;
    setImageGenerating(true);
    setToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Open blank tab immediately to avoid popup blockers
    const newTab = window.open("about:blank", "_blank");

    try {
      const roots = await getRootCollections();
      const canvas = roots.find((c) => c.title.trim().toLowerCase() === "canvas");
      if (!canvas) {
        throw new Error("Could not find Canvas root collection.");
      }

      const items = await getRaindrops(canvas._id);
      const appItem = items.find((i) => i.title === "Image generation app");

      if (!appItem || !appItem.link) {
        throw new Error("Could not find 'Image generation app' item with a valid link in Canvas collection.");
      }

      const selectedCharacters = characters.filter((c) =>
        selectedCharacterIds.has(c.id)
      );
      const selectedStyle = styles.find((s) => s.id === selectedStyleId) ?? null;

      const characterNames = selectedCharacters.map(c => c.name).join(",");
      const styleName = selectedStyle ? selectedStyle.name : "";

      const url = new URL(appItem.link);
      if (instruction) url.searchParams.set("instruction", instruction);
      if (characterNames) url.searchParams.set("characters", characterNames);
      if (styleName) url.searchParams.set("style", styleName);
      if (ratio && ratio !== "auto") url.searchParams.set("ratio", ratio);

      if (newTab) {
        newTab.location.href = url.toString();
      } else {
        window.open(url.toString(), "_blank");
      }
    } catch (error) {
      if (newTab) newTab.close();
      console.error(error);
      setToast({
        message: error instanceof Error ? error.message : "An unexpected error occurred.",
        type: "error"
      });
      toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    } finally {
      setImageGenerating(false);
    void saveCurrentAsHistoryEntry();
    }
  };

  const handleGenerateDocument = async (format: "pdf" | "jpg") => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    setToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    try {
      const selectedCharacters = characters.filter((c) =>
        selectedCharacterIds.has(c.id)
      );
      const selectedStyle = styles.find((s) => s.id === selectedStyleId) ?? null;
      await generatePromptDocument({
        characters: selectedCharacters,
        stylePack: selectedStyle,
        format,
        instruction,
        ratio,
      });
      setToast({ message: `${format.toUpperCase()} generated successfully!`, type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : `Failed to generate ${format.toUpperCase()}`, type: "error" });
    } finally {
      setPdfGenerating(false);
      void saveCurrentAsHistoryEntry();
      toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-base-100 text-base-content flex flex-col pb-16">
      {/* Navbar */}
      <nav className="navbar max-w-5xl mx-auto w-full px-6 py-4">
        <div className="flex-1">
          <span className="text-lg font-semibold tracking-tight text-base-content">
            canvas<span className="text-primary">.</span>
          </span>
        </div>
        <div className="flex-none flex items-center gap-2">
          {loggedIn ? (
            <div className="dropdown dropdown-end">
              <button
                id="btn-raindrop-user-menu"
                tabIndex={0}
                className="btn btn-ghost btn-sm rounded-full gap-2 pr-3"
                title="Raindrop.io account"
              >
                {loadingUser ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : user ? (
                  <>
                    {/* Gravatar avatar */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gravatarUrl(user.email_MD5, 48)}
                      alt={user.fullName}
                      width={20}
                      height={20}
                      className="rounded-full size-5 object-cover ring-1 ring-base-300"
                    />
                    <span className="text-sm font-normal max-w-[10rem] truncate">
                      {user.fullName}
                    </span>
                    {user.pro && (
                      <span className="badge badge-primary badge-xs">Pro</span>
                    )}
                  </>
                ) : (
                  <>
                    <RaindropIcon className="size-4 opacity-70" />
                    <span className="text-sm font-normal">Connected</span>
                  </>
                )}
                <svg
                  className="size-3 opacity-40"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>

              {/* Dropdown menu */}
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-200 border border-base-300/50 rounded-2xl shadow-lg z-50 w-52 p-2 mt-1 text-sm"
              >
                {user && (
                  <li className="menu-title px-3 py-1.5 opacity-50 text-xs truncate">
                    {user.email}
                  </li>
                )}
                <li>
                  <button
                    id="btn-raindrop-logout"
                    onClick={logout}
                    className="text-error hover:bg-error/10 rounded-xl"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Disconnect
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <button
              id="btn-raindrop-login"
              onClick={login}
              className="btn btn-outline btn-sm rounded-full text-sm gap-2"
              title="Connect Raindrop.io"
            >
              <RaindropIcon className="size-4" />
              Connect Raindrop
            </button>
          )}
        </div>
      </nav>

      {!loggedIn ? (
        <div className="flex-1 flex items-center justify-center w-full min-h-[50vh]">
          <div className="w-[70%] text-center">
            <h1
              className="text-[clamp(4rem,10vw,12rem)] leading-none text-base-content/10 select-none"
              style={{ fontFamily: "'Brush Script MT', cursive" }}
            >
              Canvas
            </h1>
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-5xl mx-auto w-full px-6">
            <hr className="border-base-300/40" />
          </div>


          {/* History Section */}
          <section className="bg-white dark:bg-zinc-800/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                History
              </h2>
            </div>
            {loadingHistory ? (
              <div className="animate-pulse flex gap-3 overflow-hidden py-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-10 w-48 bg-zinc-200 dark:bg-zinc-700 rounded-lg shrink-0"></div>
                ))}
              </div>
            ) : history.length > 0 ? (
              <select
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-zinc-900 dark:text-zinc-100"
                value={selectedHistoryEntryId}
                onChange={(e) => applyHistoryEntry(e.target.value)}
              >
                <option value="">Select from history...</option>
                {history.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                No history saved yet. Generate an image or document to save one.
              </div>
            )}
          </section>

          {/* Characters Section */}
          <section id="characters" className="py-6 px-6 max-w-5xl mx-auto w-full">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
                  Raindrop · Canvas
                </p>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  Characters
                  {charsLoading && characters.length > 0 && (
                    <span
                      className="loading loading-spinner loading-xs text-primary"
                      title="Refreshing characters..."
                    />
                  )}
                </h1>
              </div>
              {selectedCharacterIds.size > 0 && (
                <span className="badge badge-primary badge-lg gap-1.5">
                  {selectedCharacterIds.size} selected
                </span>
              )}
            </div>

            {/* Loading (only when no cached characters available) */}
            {charsLoading && characters.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            )}

            {/* Error */}
            {charsError && (
              <div role="alert" className="alert alert-error">
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{charsError}</span>
              </div>
            )}

            {/* Empty state */}
            {!charsLoading && !charsError && characters.length === 0 && (
              <div className="text-center py-12 text-base-content/40">
                <p className="text-lg">No characters found.</p>
                <p className="text-sm mt-1">
                  Make sure your Raindrop account has a root collection named &ldquo;Canvas&rdquo; with a child collection named &ldquo;Characters&rdquo; containing image items.
                </p>
              </div>
            )}

            {/* Chips */}
            {characters.length > 0 && chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {chips.map((chip) => {
                  const active = isChipActive(chip);
                  return (
                    <button
                      key={chip}
                      onClick={() => toggleChip(chip)}
                      className={`btn btn-sm rounded-full ${
                        active ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grid — multi-select */}
            {characters.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {characters.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    selected={selectedCharacterIds.has(char.id)}
                    onToggle={() => toggleCharacter(char.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="max-w-5xl mx-auto w-full px-6">
            <hr className="border-base-300/40" />
          </div>

          {/* Styles Section */}
          <section id="styles" className="py-6 px-6 max-w-5xl mx-auto w-full">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
                  Raindrop · Canvas
                </p>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  Styles
                  {stylesLoading && styles.length > 0 && (
                    <span
                      className="loading loading-spinner loading-xs text-secondary"
                      title="Refreshing styles..."
                    />
                  )}
                </h2>
              </div>
              {selectedStyleId !== null && (
                <span className="badge badge-secondary badge-lg">1 selected</span>
              )}
            </div>

            {/* Loading (only when no cached styles available) */}
            {stylesLoading && styles.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            )}

            {/* Error */}
            {stylesError && (
              <div role="alert" className="alert alert-error">
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{stylesError}</span>
              </div>
            )}

            {/* Empty state */}
            {!stylesLoading && !stylesError && styles.length === 0 && (
              <div className="text-center py-12 text-base-content/40">
                <p className="text-lg">No style packs found.</p>
                <p className="text-sm mt-1">
                  Make sure your Raindrop account has a root collection named &ldquo;Canvas&rdquo; with a child collection named &ldquo;Styles&rdquo; containing style pack sub-collections.
                </p>
              </div>
            )}

            {/* Grid — single-select */}
            {styles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {styles.map((pack) => (
                  <StylePackCard
                    key={pack.id}
                    pack={pack}
                    selected={selectedStyleId === pack.id}
                    onToggle={() => toggleStyle(pack.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="max-w-5xl mx-auto w-full px-6">
            <hr className="border-base-300/40" />
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* Prompt Controls Section                                             */}
          {/* ------------------------------------------------------------------ */}
          <section
            id="prompt-controls"
            className="py-6 px-6 max-w-5xl mx-auto w-full"
          >
            <div className="flex flex-col gap-6">
              {/* Instruction textarea */}
              <div className="form-control gap-2">
                <label htmlFor="instruction" className="label pb-0">
                  <span className="label-text font-medium">Instruction</span>
                </label>
                <textarea
                  id="instruction"
                  className="textarea textarea-bordered w-full min-h-36 resize-y text-sm leading-relaxed focus:textarea-primary transition-colors"
                  placeholder="Describe what you want to generate…"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
                {instruction.length > 0 && (
                  <span className="text-xs text-base-content/40 text-right">
                    {instruction.length} chars
                  </span>
                )}
              </div>

              {/* Ratio select */}
              <div className="form-control">
                <select
                  id="ratio"
                  className="select select-bordered w-full max-w-xs focus:select-primary transition-colors"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                >
                  {RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate PDF button */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  id="btn-generate-image"
                  onClick={handleGenerateImage}
                  disabled={imageGenerating}
                  className="btn btn-secondary gap-2 rounded-full px-6 shadow-md hover:shadow-lg transition-shadow"
                >
                  {imageGenerating ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Generate Image
                    </>
                  )}
                </button>

                <button
                  id="btn-generate-pdf"
                  onClick={() => handleGenerateDocument('pdf')}
                  disabled={pdfGenerating}
                  className="btn btn-primary gap-2 rounded-full px-6 shadow-md hover:shadow-lg transition-shadow"
                >
                  {pdfGenerating ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Building PDF…
                    </>
                  ) : (
                    <>
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      Generate PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {toast && (
        <div className="toast toast-end z-50">
          <div className={`alert ${toast.type === "success" ? "alert-success text-success-content" : "alert-error text-error-content"} shadow-lg`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// StylePackCard — single-select
// ---------------------------------------------------------------------------
function StylePackCard({
  pack,
  selected,
  onToggle,
}: {
  pack: StylePack;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      onClick={onToggle}
      role="button"
      aria-pressed={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      className={[
        "card bg-base-200 border transition-all duration-300 group overflow-hidden cursor-pointer outline-none",
        selected
          ? "border-secondary shadow-lg ring-2 ring-secondary/40"
          : "border-base-300/50 hover:border-secondary/40 hover:shadow-lg",
      ].join(" ")}
    >
      {/* Selection indicator */}
      <div className="relative">
        {pack.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pack.previewUrl}
            alt={pack.name}
            className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full aspect-video bg-base-300/50 flex items-center justify-center">
            <svg className="size-12 text-base-content/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Check badge */}
        {selected && (
          <span className="absolute top-2 right-2 badge badge-secondary gap-1 shadow">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Selected
          </span>
        )}
      </div>

      <div className="card-body gap-1 p-2">
        {/* Pack name */}
        <h3
          className={[
            "card-title text-sm font-semibold transition-colors duration-200 truncate block",
            selected ? "text-secondary" : "group-hover:text-secondary",
          ].join(" ")}
          title={pack.name}
        >
          {pack.name}
        </h3>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// CharacterCard — multi-select
// ---------------------------------------------------------------------------
function CharacterCard({
  character,
  selected,
  onToggle,
}: {
  character: Character;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      onClick={onToggle}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      className={[
        "card bg-base-200 border transition-all duration-300 group overflow-hidden cursor-pointer outline-none",
        selected
          ? "border-primary shadow-lg ring-2 ring-primary/40"
          : "border-base-300/50 hover:border-primary/30 hover:shadow-lg",
      ].join(" ")}
    >
      {/* Image preview */}
      <div className="relative">
        {character.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full aspect-video bg-base-300/50 flex items-center justify-center">
            <svg className="size-12 text-base-content/20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
            </svg>
          </div>
        )}

        {/* Checkbox overlay */}
        <span
          className={[
            "absolute top-2 right-2 size-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow",
            selected
              ? "bg-primary border-primary text-primary-content"
              : "bg-base-100/70 border-base-300 backdrop-blur-sm",
          ].join(" ")}
        >
          {selected && (
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </div>

      <div className="card-body gap-1 p-2">
        {/* Character name */}
        <h2
          className={[
            "card-title text-sm font-semibold transition-colors duration-200 truncate block",
            selected ? "text-primary" : "group-hover:text-primary",
          ].join(" ")}
          title={character.name}
        >
          {character.name}
        </h2>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Raindrop logo icon (simplified drop shape)
// ---------------------------------------------------------------------------
function RaindropIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C12 2 4 10.5 4 15a8 8 0 0016 0C20 10.5 12 2 12 2z" />
    </svg>
  );
}
