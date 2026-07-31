/**
 * PDF generation for the Canvas prompt sheet.
 *
 * Produces a structured PDF containing:
 *   - The full system prompt text with all placeholders filled in
 *   - Character reference images embedded as thumbnails
 *   - Style reference images embedded as thumbnails
 *
 * Images are fetched server-side via /api/image-proxy to avoid CORS.
 */

import { jsPDF } from "jspdf";
import type { Character } from "./characters";
import type { StylePack } from "./styles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetches an image URL through the server-side proxy and returns a data URL. */
async function proxyImage(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(
      `/api/image-proxy?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Resolves a list of image URLs to data URLs, skipping any that fail. */
async function resolveImages(urls: string[]): Promise<string[]> {
  const results = await Promise.all(urls.map(proxyImage));
  return results.filter((d): d is string => d !== null);
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 18; // side margin mm
const CONTENT_W = PAGE_W - MARGIN * 2;

// Typography
const FONT_TITLE = 13;
const FONT_SECTION = 11;
const FONT_BODY = 9;
const FONT_MONO = 8;

// Colors (RGB)
const COLOR_TITLE: [number, number, number] = [30, 30, 30];
const COLOR_SECTION: [number, number, number] = [60, 80, 140];
const COLOR_BODY: [number, number, number] = [50, 50, 50];
const COLOR_DIVIDER: [number, number, number] = [200, 210, 230];
const COLOR_LABEL: [number, number, number] = [100, 120, 170];
const COLOR_PAGE_BG: [number, number, number] = [248, 249, 252];

// ---------------------------------------------------------------------------
// PDF writer state
// ---------------------------------------------------------------------------

interface WriterState {
  doc: jsPDF;
  y: number;
  pageCount: number;
}

function newPage(state: WriterState): void {
  state.doc.addPage();
  state.pageCount++;
  state.y = MARGIN;
  // Subtle page background
  state.doc.setFillColor(...COLOR_PAGE_BG);
  state.doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function ensureSpace(state: WriterState, needed: number): void {
  if (state.y + needed > PAGE_H - MARGIN) {
    newPage(state);
  }
}

function drawDivider(state: WriterState): void {
  ensureSpace(state, 6);
  state.doc.setDrawColor(...COLOR_DIVIDER);
  state.doc.setLineWidth(0.3);
  state.doc.line(MARGIN, state.y, PAGE_W - MARGIN, state.y);
  state.y += 5;
}

function writeTitle(state: WriterState, text: string): void {
  ensureSpace(state, 12);
  state.doc.setFont("lxgw", "bold");
  state.doc.setFontSize(FONT_TITLE);
  state.doc.setTextColor(...COLOR_TITLE);
  state.doc.text(text, MARGIN, state.y);
  state.y += 8;
}

function writeSectionHeader(
  state: WriterState,
  text: string,
  number?: string
): void {
  ensureSpace(state, 14);
  state.y += 3;
  // Accent bar
  state.doc.setFillColor(...COLOR_SECTION);
  state.doc.rect(MARGIN, state.y - 4, 2, 7, "F");
  // Number badge
  if (number) {
    state.doc.setFillColor(...COLOR_SECTION);
    state.doc.roundedRect(MARGIN + 4, state.y - 4, 6, 6, 1, 1, "F");
    state.doc.setFont("lxgw", "bold");
    state.doc.setFontSize(7);
    state.doc.setTextColor(255, 255, 255);
    state.doc.text(number, MARGIN + 7, state.y - 0.3, { align: "center" });
  }
  const xText = number ? MARGIN + 13 : MARGIN + 6;
  state.doc.setFont("lxgw", "bold");
  state.doc.setFontSize(FONT_SECTION);
  state.doc.setTextColor(...COLOR_SECTION);
  state.doc.text(text, xText, state.y);
  state.y += 7;
}

function writeLabel(state: WriterState, text: string): void {
  ensureSpace(state, 6);
  state.doc.setFont("lxgw", "bolditalic");
  state.doc.setFontSize(FONT_BODY - 0.5);
  state.doc.setTextColor(...COLOR_LABEL);
  state.doc.text(text, MARGIN, state.y);
  state.y += 4.5;
}

function writeBody(state: WriterState, text: string, maxW = CONTENT_W): void {
  if (!text.trim()) return;
  state.doc.setFont("lxgw", "normal");
  state.doc.setFontSize(FONT_BODY);
  state.doc.setTextColor(...COLOR_BODY);
  const lines = state.doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    ensureSpace(state, 5);
    state.doc.text(line, MARGIN, state.y);
    state.y += 4.5;
  }
  state.y += 1;
}

function writeMono(state: WriterState, text: string): void {
  if (!text.trim()) return;
  state.doc.setFont("lxgw", "normal");
  state.doc.setFontSize(FONT_MONO);
  state.doc.setTextColor(...COLOR_BODY);
  const lines = state.doc.splitTextToSize(text, CONTENT_W) as string[];
  for (const line of lines) {
    ensureSpace(state, 5);
    state.doc.text(line, MARGIN, state.y);
    state.y += 4;
  }
  state.y += 1;
}

/** Downscales and compresses a data URL image via the browser Image and Canvas API. */
function processImage(
  dataUrl: string
): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      const MAX_SIZE = 800; // max dimension
      if (w > MAX_SIZE || h > MAX_SIZE) {
        if (w > h) {
          h = Math.round(h * (MAX_SIZE / w));
          w = MAX_SIZE;
        } else {
          w = Math.round(w * (MAX_SIZE / h));
          h = MAX_SIZE;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Use white background in case of transparent PNG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        // Compress to JPEG to save space
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve({ dataUrl: compressedDataUrl, w, h });
      } else {
        // Fallback
        resolve({ dataUrl, w, h });
      }
    };
    img.onerror = () => resolve({ dataUrl, w: 1, h: 1 }); // fallback
    img.src = dataUrl;
  });
}

/**
 * Embeds images (data URLs) at full content width, one per row, preserving
 * each image's original aspect ratio.
 *
 * Width  = CONTENT_W  (PDF width minus left + right margins)
 * Height = CONTENT_W × (naturalH / naturalW), capped at the usable page
 *          height so an extremely tall image never overflows a single page.
 */
async function writeImageRow(
  state: WriterState,
  dataUrls: string[]
): Promise<void> {
  if (dataUrls.length === 0) return;

  const gap = 4;
  const maxImgH = PAGE_H - MARGIN * 2 - 10; // never overflow a page

  // Resolve natural sizes and compress every image up-front.
  const processed = await Promise.all(dataUrls.map(processImage));

  for (let i = 0; i < processed.length; i++) {
    const { dataUrl, w, h } = processed[i];
    const imgW = CONTENT_W;
    const imgH = Math.min(w > 0 ? imgW * (h / w) : imgW, maxImgH);

    ensureSpace(state, imgH + gap);

    try {
      state.doc.addImage(dataUrl, "JPEG", MARGIN, state.y, imgW, imgH);
    } catch {
      try {
        state.doc.addImage(dataUrl, MARGIN, state.y, imgW, imgH);
      } catch {
        // skip broken images silently
      }
    }

    state.y += imgH + gap;
  }
  state.y += 2;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface GeneratePdfOptions {
  characters: Character[];
  stylePack: StylePack | null;
  instruction: string;
  ratio: string;
}

export async function generatePromptPdf(
  options: GeneratePdfOptions
): Promise<void> {
  const { characters, stylePack, instruction, ratio } = options;

  // ── 0. Load custom font for CJK support ──────────────────────────────────
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  try {
    const fontRes = await fetch("/fonts/LXGWWenKaiLite-Regular.ttf");
    if (fontRes.ok) {
      const fontBuffer = await fontRes.arrayBuffer();
      const base64Font = btoa(
        new Uint8Array(fontBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      doc.addFileToVFS("LXGWWenKaiLite-Regular.ttf", base64Font);
      doc.addFont("LXGWWenKaiLite-Regular.ttf", "lxgw", "normal");
      doc.addFont("LXGWWenKaiLite-Regular.ttf", "lxgw", "bold");
      doc.addFont("LXGWWenKaiLite-Regular.ttf", "lxgw", "bolditalic");
    }
  } catch (err) {
    console.warn("Failed to load custom font:", err);
  }

  // ── 1. Resolve all images concurrently ────────────────────────────────────
  const [charImageDataUrls, styleImageDataUrls] = await Promise.all([
    resolveImages(characters.map((c) => c.imageUrl).filter(Boolean)),
    stylePack
      ? resolveImages(stylePack.referenceImages.filter(Boolean))
      : Promise.resolve([] as string[]),
  ]);

  // ── 2. Build character prompts text ───────────────────────────────────────
  const characterPrompts = characters
    .map((c) => {
      const lines = [`Character: ${c.name}`];
      if (c.prompt) lines.push(c.prompt);
      return lines.join("\n");
    })
    .join("\n\n");

  // ── 3. Create document ────────────────────────────────────────────────────
  // (doc is created above to register fonts)

  // Initial page background
  doc.setFillColor(...COLOR_PAGE_BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  const state: WriterState = { doc, y: MARGIN, pageCount: 1 };

  // ── 4. Header ─────────────────────────────────────────────────────────────
  state.doc.setFillColor(40, 55, 110);
  state.doc.rect(0, 0, PAGE_W, 14, "F");
  state.doc.setFont("lxgw", "bold");
  state.doc.setFontSize(10);
  state.doc.setTextColor(255, 255, 255);
  state.doc.text("canvas · AI Prompt Sheet", MARGIN, 9);
  state.y = 20;

  // ── 5. Preamble ───────────────────────────────────────────────────────────
  writeTitle(state, "Composite Image Generation Prompt");

  const preamble = `You are compositing ONE final image from three independent authorities. Read this first and treat it as absolute:

STYLE LOCK — The finished image's rendering (HOW everything is drawn) is dictated SOLELY by the STYLE AUTHORITY in section 3. No other input may influence rendering. The character reference images are IDENTITY DOCUMENTATION ONLY — they may be drawn in a placeholder or unrelated style that you MUST ignore and MUST NOT imitate, sample, or blend. Reconstruct every character from scratch in the target style, as if your only knowledge of them were the written identity text.

From the character reference images, do NOT copy any of: linework, stroke/brush quality, edge treatment, palette, color grading, shading model, lighting, texture, rendering density, level of detail, or finish. Extract ONLY identity: silhouette-defining traits, clothing, markings, colors-as-identity (e.g. "red scarf"), accessories, and proportions tied to who they are.

Priority rules:`;

  writeBody(state, preamble);
  drawDivider(state);

  // ── 6. Section 1 — Content / Composition ─────────────────────────────────
  writeSectionHeader(
    state,
    "CONTENT / COMPOSITION AUTHORITY",
    "1"
  );
  writeBody(
    state,
    "Governs what appears, scene layout, framing, camera, and spatial arrangement."
  );

  writeLabel(state, "User instruction:");
  writeBody(state, instruction || "(no instruction provided)");

  writeLabel(state, "Attachments:");
  writeBody(state, "pls see other attached files and images.");

  drawDivider(state);

  // ── 7. Section 2 — Character Identity ────────────────────────────────────
  writeSectionHeader(state, "CHARACTER IDENTITY AUTHORITY", "2");
  writeBody(
    state,
    "Governs WHO the characters are: identity-defining traits, clothing, markings, identity colors, accessories. Treat the extracted identity TEXT as the source of truth; use the character images only to confirm identity, NEVER as a visual or style source. Redraw all characters entirely in the STYLE."
  );

  writeLabel(state, "Character description:");
  if (characterPrompts) {
    writeMono(state, characterPrompts);
  } else {
    writeBody(state, "(no characters selected)");
  }

  if (charImageDataUrls.length > 0) {
    writeLabel(state, "Character reference images:");
    await writeImageRow(state, charImageDataUrls);
  }

  drawDivider(state);

  // ── 8. Section 3 — Style Authority ───────────────────────────────────────
  writeSectionHeader(state, "STYLE AUTHORITY", "3");
  writeBody(
    state,
    "The ONLY source for how anything is drawn. Apply globally to every character, object, background, and detail. The output must read as if made by the same hand as the style references."
  );

  writeLabel(state, "Style guide extracted from references:");
  writeBody(state, stylePack?.stylePrompt || "(no style selected)");

  if (stylePack?.extraInstruction) {
    writeLabel(
      state,
      "Optional extra style instruction (pay extra attention if provided):"
    );
    writeBody(state, stylePack.extraInstruction);
  }

  if (styleImageDataUrls.length > 0) {
    writeLabel(state, "Original style reference images:");
    await writeImageRow(state, styleImageDataUrls);
  }

  writeLabel(state, "Mandatory style compliance checklist:");
  const checklist = [
    "- Match reference stroke / brush / line quality and edge treatment.",
    "- Match reference character-design language while preserving the supplied identities.",
    "- Match reference simplification, object/environment arrangement, and compositional grammar.",
    "- Match palette, contrast, shading, texture, and rendering density.",
    "- Reject any generic polished digital-art look that differs from the style reference.",
  ].join("\n");
  writeBody(state, checklist);

  drawDivider(state);

  // ── 9. Conflict resolution ────────────────────────────────────────────────
  writeLabel(state, "Conflict resolution (strict):");
  const conflicts = [
    "- CONTENT decides what and where.",
    "- IDENTITY decides who.",
    "- STYLE decides how everything is drawn — always, with ZERO contribution from content images or character images to rendering.",
    "- If a character image's look conflicts with the style reference, the style reference wins 100%.",
  ].join("\n");
  writeBody(state, conflicts);

  drawDivider(state);

  // ── 10. Section 4 — Misc ──────────────────────────────────────────────────
  writeSectionHeader(state, "MISC", "4");
  writeLabel(state, "Ratio:");
  writeBody(state, ratio || "auto");

  // ── 11. Footer on every page ──────────────────────────────────────────────
  const totalPages = state.doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    state.doc.setPage(p);
    state.doc.setFont("lxgw", "normal");
    state.doc.setFontSize(7);
    state.doc.setTextColor(160, 170, 190);
    state.doc.text(
      `canvas · AI Prompt Sheet · Page ${p} of ${totalPages}`,
      PAGE_W / 2,
      PAGE_H - 6,
      { align: "center" }
    );
  }

  // ── 12. Save ───────────────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  doc.save(`canvas-prompt-${timestamp}.pdf`);
}
