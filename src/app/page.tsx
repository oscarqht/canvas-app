"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
// Page
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { loggedIn, user, loadingUser, login, logout } = useRaindropAuth();

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
          <Link href="#work" className="btn btn-ghost btn-sm rounded-full text-sm font-normal">
            Work
          </Link>
          <Link href="#about" className="btn btn-ghost btn-sm rounded-full text-sm font-normal">
            About
          </Link>
          <Link href="#contact" className="btn btn-primary btn-sm rounded-full text-sm">
            Contact
          </Link>

          {/* ── Raindrop Auth ── */}
          <div className="divider divider-horizontal mx-1 h-5 self-center" />

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

      {/* Auth status banner */}
      {loggedIn && user && (
        <div className="bg-success/10 border-b border-success/20 text-success text-xs text-center py-1.5 px-4">
          ✓ Connected as <strong>{user.fullName}</strong> — access token stored locally
        </div>
      )}

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-3xl mx-auto w-full">
        <div className="badge badge-outline badge-sm mb-6 tracking-widest uppercase text-xs opacity-60">
          Available for work
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
          Crafting ideas into{" "}
          <span className="text-primary">digital experiences</span>
        </h1>
        <p className="text-base-content/60 text-lg max-w-xl leading-relaxed mb-10">
          I design and build thoughtful interfaces that are simple, fast, and
          a pleasure to use. Let&apos;s make something great together.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="#work" className="btn btn-primary rounded-full px-8">
            View My Work
          </Link>
          <Link href="#about" className="btn btn-ghost rounded-full px-8">
            Learn More
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="divider max-w-5xl mx-auto w-full px-6 opacity-20" />

      {/* Stats Row */}
      <section className="py-14 px-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "5+", label: "Years Experience" },
            { value: "40+", label: "Projects Shipped" },
            { value: "12+", label: "Happy Clients" },
            { value: "99%", label: "Satisfaction Rate" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-primary">{value}</span>
              <span className="text-sm text-base-content/50">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="divider max-w-5xl mx-auto w-full px-6 opacity-20" />

      {/* Work Section */}
      <section id="work" className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
            Selected Work
          </p>
          <h2 className="text-3xl font-bold tracking-tight">Recent Projects</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              tag: "Design System",
              title: "Lunar UI",
              desc: "A cohesive component library built for scale and accessibility.",
            },
            {
              tag: "Web App",
              title: "Folio Dashboard",
              desc: "Real-time analytics dashboard with a clean, data-dense layout.",
            },
            {
              tag: "Branding",
              title: "Arca Studio",
              desc: "Visual identity and brand guide for a modern architecture firm.",
            },
          ].map(({ tag, title, desc }) => (
            <article
              key={title}
              className="card bg-base-200 border border-base-300/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="card-body gap-3">
                <span className="badge badge-ghost badge-sm w-fit text-xs">{tag}</span>
                <h3 className="card-title text-lg font-semibold group-hover:text-primary transition-colors duration-200">
                  {title} →
                </h3>
                <p className="text-sm text-base-content/55 leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
              About Me
            </p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Focused on craft &amp; clarity
            </h2>
            <p className="text-base-content/60 leading-relaxed mb-4">
              I&apos;m a designer and developer who believes great products come from
              the intersection of strong aesthetics and clean engineering.
            </p>
            <p className="text-base-content/60 leading-relaxed">
              I work across the full stack — from wireframes to deployment —
              helping teams ship products their users love.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              "Next.js", "TypeScript", "Tailwind CSS", "Figma",
              "Node.js", "PostgreSQL", "Framer Motion", "Vercel",
            ].map((skill) => (
              <span key={skill} className="badge badge-outline rounded-full px-4 py-3 text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section
        id="contact"
        className="py-24 px-6 max-w-5xl mx-auto w-full text-center"
      >
        <div className="bg-base-200 border border-base-300/50 rounded-3xl py-16 px-8">
          <p className="text-xs uppercase tracking-widest text-base-content/40 mb-3">
            Get In Touch
          </p>
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Let&apos;s work together
          </h2>
          <p className="text-base-content/55 max-w-md mx-auto mb-8 leading-relaxed">
            Have a project in mind? I&apos;d love to hear about it. Drop me a message
            and let&apos;s build something meaningful.
          </p>
          <a
            href="mailto:hello@canvas.dev"
            className="btn btn-primary rounded-full px-10"
          >
            Say Hello →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300/40 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-base-content/40">
          <span>© 2026 canvas. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-base-content transition-colors">Twitter</a>
            <a href="#" className="hover:text-base-content transition-colors">GitHub</a>
            <a href="#" className="hover:text-base-content transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </main>
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
