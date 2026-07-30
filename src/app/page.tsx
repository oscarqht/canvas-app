"use client";

import { useEffect, useState, useCallback } from "react";
import {
  isLoggedIn,
  clearTokens,
  redirectToRaindropAuth,
} from "@/lib/auth";
import {
  getAuthenticatedUser,
  gravatarUrl,
  type RaindropUser,
} from "@/lib/raindrop";
import { fetchCharacters, type Character } from "@/lib/characters";
import { fetchStylePacks, type StylePack } from "@/lib/styles";

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
    setLoading(true);
    setError(null);
    try {
      const chars = await fetchCharacters();
      setCharacters(chars);
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
    setLoading(true);
    setError(null);
    try {
      const packs = await fetchStylePacks();
      setStyles(packs);
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
// Page
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { loggedIn, user, loadingUser, login, logout } = useRaindropAuth();
  const { characters, loading: charsLoading, error: charsError } = useCharacters(loggedIn);
  const { styles, loading: stylesLoading, error: stylesError } = useStyles(loggedIn);

  return (
    <main className="min-h-screen bg-base-100 text-base-content flex flex-col">
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

      {/* Characters Section */}
      <section id="characters" className="flex-1 py-10 px-6 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
            Raindrop · Canvas
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
        </div>

        {/* Not logged in */}
        {!loggedIn && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <RaindropIcon className="size-10 text-base-content/20" />
            <p className="text-base-content/50">
              Connect your Raindrop account to browse characters.
            </p>
            <button
              onClick={login}
              className="btn btn-primary btn-sm rounded-full gap-2"
            >
              <RaindropIcon className="size-4" />
              Connect Raindrop
            </button>
          </div>
        )}

        {/* Loading */}
        {loggedIn && charsLoading && (
          <div className="flex items-center justify-center py-32">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {/* Error */}
        {loggedIn && charsError && (
          <div role="alert" className="alert alert-error">
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{charsError}</span>
          </div>
        )}

        {/* Empty state */}
        {loggedIn && !charsLoading && !charsError && characters.length === 0 && (
          <div className="text-center py-32 text-base-content/40">
            <p className="text-lg">No characters found.</p>
            <p className="text-sm mt-1">
              Make sure your Raindrop account has a root collection named &ldquo;Canvas&rdquo; with a child collection named &ldquo;Characters&rdquo; containing image items.
            </p>
          </div>
        )}

        {/* Grid */}
        {loggedIn && !charsLoading && characters.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {characters.map((char) => (
              <CharacterCard key={char.id} character={char} />
            ))}
          </div>
        )}
      </section>

      {/* Styles Section */}
      <section id="styles" className="flex-1 py-10 px-6 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
            Raindrop · Canvas
          </p>
          <h2 className="text-3xl font-bold tracking-tight">Styles</h2>
        </div>

        {/* Not logged in */}
        {!loggedIn && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <RaindropIcon className="size-10 text-base-content/20" />
            <p className="text-base-content/50">
              Connect your Raindrop account to browse styles.
            </p>
          </div>
        )}

        {/* Loading */}
        {loggedIn && stylesLoading && (
          <div className="flex items-center justify-center py-32">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {/* Error */}
        {loggedIn && stylesError && (
          <div role="alert" className="alert alert-error">
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{stylesError}</span>
          </div>
        )}

        {/* Empty state */}
        {loggedIn && !stylesLoading && !stylesError && styles.length === 0 && (
          <div className="text-center py-32 text-base-content/40">
            <p className="text-lg">No style packs found.</p>
            <p className="text-sm mt-1">
              Make sure your Raindrop account has a root collection named &ldquo;Canvas&rdquo; with a child collection named &ldquo;Styles&rdquo; containing style pack sub-collections.
            </p>
          </div>
        )}

        {/* Grid */}
        {loggedIn && !stylesLoading && styles.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {styles.map((pack) => (
              <StylePackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// StylePackCard
// ---------------------------------------------------------------------------
function StylePackCard({ pack }: { pack: StylePack }) {
  return (
    <article
      className="card bg-base-200 border border-base-300/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group overflow-hidden"
    >
      {/* Preview thumbnail */}
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

      <div className="card-body gap-3 p-4">
        {/* Pack name */}
        <h3 className="card-title text-base font-semibold group-hover:text-primary transition-colors duration-200">
          {pack.name}
        </h3>

        {/* Style prompt (excerpt) */}
        {pack.stylePrompt && (
          <p className="text-sm text-base-content/55 leading-relaxed line-clamp-3">
            {pack.stylePrompt}
          </p>
        )}

        {/* Extra instruction (note) */}
        {pack.extraInstruction && (
          <p className="text-xs text-base-content/40 italic leading-relaxed line-clamp-2">
            {pack.extraInstruction}
          </p>
        )}

        {/* Reference images count badge */}
        {pack.referenceImages.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <svg className="size-3.5 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-xs text-base-content/40">
              {pack.referenceImages.length} reference{pack.referenceImages.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// CharacterCard
// ---------------------------------------------------------------------------
function CharacterCard({ character }: { character: Character }) {
  return (
    <article
      className="card bg-base-200 border border-base-300/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group overflow-hidden"
    >
      {/* Image preview */}
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

      <div className="card-body gap-3 p-4">
        {/* Character name */}
        <h2 className="card-title text-base font-semibold group-hover:text-primary transition-colors duration-200">
          {character.name}
        </h2>

        {/* Prompt (excerpt) */}
        {character.prompt && (
          <p className="text-sm text-base-content/55 leading-relaxed line-clamp-3">
            {character.prompt}
          </p>
        )}

        {/* Matching patterns (note) */}
        {character.patterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {character.patterns.map((pattern) => (
              <span
                key={pattern}
                className="badge badge-ghost badge-sm text-xs font-mono"
              >
                {pattern}
              </span>
            ))}
          </div>
        )}
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
