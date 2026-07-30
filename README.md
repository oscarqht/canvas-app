# Canvas — AI Prompt Sheet Generator

**Canvas** is a web application built with Next.js that connects with your [Raindrop.io](https://raindrop.io) bookmarks to generate structured, professional AI image generation prompt sheets and PDF spec documents.

---

## 🌟 Key Features

- **Raindrop.io Integration**: Connect via Raindrop OAuth 2.0 to dynamically load your characters and style packs directly from your bookmarks.
- **Character Identity Library**: Automatically fetches and parses character reference images, identity prompts, and matching keywords.
- **Style Pack Library**: Extracts visual style reference images, core style prompts, and extra instructions from nested Raindrop collections.
- **Authority-Based Prompt Compositor**: Combines Content/Composition, Character Identity, and Style Authority rules into structured prompts designed for image generation models.
- **Client-Side PDF Generation**: Exports clean, formatted A4 PDF spec sheets using `jsPDF`, with embedded reference image thumbnails fetched via a CORS proxy.
- **Modern UI**: Styled with Tailwind CSS & DaisyUI, supporting real-time character/style selection, searching, previewing, and interactive configuration.

---

## 📁 Raindrop.io Collection Structure

For Canvas to automatically discover your characters and style packs, set up your Raindrop.io collections as follows:

```text
Root Collection: Canvas
├── Child Collection: Characters
│   ├── [Bookmark 1] (Image bookmark)
│   │   ├── Title: Character Name (e.g., "Elena")
│   │   ├── Excerpt: Character identity prompt / description
│   │   └── Note: Comma-separated matching keywords (e.g., "elena, female warrior")
│   └── [Bookmark 2] ...
│
└── Child Collection: Styles
    └── Child Collection: [Style Pack Name] (e.g., "Cyberpunk Anime")
        ├── Bookmark named "preview.jpg"
        │   ├── Cover: Style preview thumbnail
        │   ├── Excerpt: Style guide / rendering instructions
        │   └── Note: Optional extra style instructions
        └── Bookmarks named "reference-1.jpg", "reference-2.png", etc.
            └── Covers / Media: Original style reference images
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **Raindrop.io Developer Application**: Create an application at [Raindrop API Integrations](https://developer.raindrop.io/) to obtain your Client ID and Client Secret.

### 1. Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```bash
NEXT_PUBLIC_RAINDROP_CLIENT_ID=your_client_id
RAINDROP_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_RAINDROP_REDIRECT_URI=http://localhost:3000/auth/raindrop/callback
```

### 2. Installation & Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start using the app.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [DaisyUI v5](https://daisyui.com/)
- **PDF Export**: [jsPDF](https://github.com/parallax/jsPDF)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Authentication**: Raindrop.io OAuth 2.0 (Authorization Code flow with automatic token refresh)

---

## 📜 License

MIT

