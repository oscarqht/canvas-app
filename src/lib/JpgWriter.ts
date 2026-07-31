import { DocumentWriter } from "./DocumentWriter";

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const SCALE = 4; // To render crisp images/text, scale internal canvas
const MM_TO_PX = 3.7795275591; // 96 DPI

export class JpgWriter implements DocumentWriter {
  private canvases: HTMLCanvasElement[] = [];
  private contexts: CanvasRenderingContext2D[] = [];
  private currentPage = 0;

  // State
  private fillColor = "rgb(0,0,0)";
  private drawColor = "rgb(0,0,0)";
  private lineWidth = 1;
  private textColor = "rgb(0,0,0)";
  private fontName = "lxgw";
  private fontStyle = "normal";
  private fontSize = 10;

  constructor() {
    this.addPage();
  }

  private get ctx() {
    return this.contexts[this.currentPage];
  }

  private mmToPx(mm: number) {
    return mm * MM_TO_PX * SCALE;
  }

  addPage(): void {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W * MM_TO_PX * SCALE;
    canvas.height = PAGE_H * MM_TO_PX * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create canvas context");

    // Fill white by default
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.canvases.push(canvas);
    this.contexts.push(ctx);
    this.currentPage = this.canvases.length - 1;

    // Apply current state to new ctx
    this.updateCtxFont(ctx);
  }

  setFillColor(r: number, g: number, b: number): void {
    this.fillColor = `rgb(${r},${g},${b})`;
  }

  rect(x: number, y: number, w: number, h: number, style: string): void {
    const ctx = this.ctx;
    const pxX = this.mmToPx(x);
    const pxY = this.mmToPx(y);
    const pxW = this.mmToPx(w);
    const pxH = this.mmToPx(h);

    if (style.includes("F")) {
      ctx.fillStyle = this.fillColor;
      ctx.fillRect(pxX, pxY, pxW, pxH);
    }
    if (style.includes("S") || style === "") {
      ctx.strokeStyle = this.drawColor;
      ctx.lineWidth = this.lineWidth;
      ctx.strokeRect(pxX, pxY, pxW, pxH);
    }
  }

  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style: string): void {
    const ctx = this.ctx;
    const pxX = this.mmToPx(x);
    const pxY = this.mmToPx(y);
    const pxW = this.mmToPx(w);
    const pxH = this.mmToPx(h);
    const pxRx = this.mmToPx(rx);
    // Assuming uniform radius in canvas for simplicity if rx=ry

    ctx.beginPath();
    ctx.roundRect(pxX, pxY, pxW, pxH, [pxRx]); // using modern roundRect

    if (style.includes("F")) {
      ctx.fillStyle = this.fillColor;
      ctx.fill();
    }
    if (style.includes("S") || style === "") {
      ctx.strokeStyle = this.drawColor;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }
  }

  setDrawColor(r: number, g: number, b: number): void {
    this.drawColor = `rgb(${r},${g},${b})`;
  }

  setLineWidth(width: number): void {
    this.lineWidth = this.mmToPx(width);
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.drawColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.mmToPx(x1), this.mmToPx(y1));
    ctx.lineTo(this.mmToPx(x2), this.mmToPx(y2));
    ctx.stroke();
  }

  setFont(fontName: string, fontStyle: string): void {
    this.fontName = fontName;
    this.fontStyle = fontStyle;
    this.updateCtxFont(this.ctx);
  }

  setFontSize(size: number): void {
    this.fontSize = size;
    this.updateCtxFont(this.ctx);
  }

  private getCssFont() {
    // mm to pt to px conversion: jsPDF font sizes are usually in pt.
    // 1 pt = 1.333 px. But to match jsPDF output let's scale it.
    // jsPDF standard unit is mm, but font size is in points by default.
    // However jsPDF scale factor changes this. We will try an approximate mapping.
    const pxSize = this.fontSize * 1.333 * SCALE;
    let weight = "normal";
    let style = "normal";

    if (this.fontStyle.includes("bold")) weight = "bold";
    if (this.fontStyle.includes("italic")) style = "italic";

    let font = `"LXGW WenKai Lite", sans-serif`;
    if (this.fontName === 'courier' || this.fontName === 'mono') {
       font = 'monospace';
    }
    return `${style} ${weight} ${pxSize}px ${font}`;
  }

  private updateCtxFont(ctx: CanvasRenderingContext2D) {
    ctx.font = this.getCssFont();
  }

  setTextColor(r: number, g: number, b: number): void {
    this.textColor = `rgb(${r},${g},${b})`;
  }

  text(text: string, x: number, y: number, options?: { align?: string }): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.textColor;
    this.updateCtxFont(ctx);
    ctx.textAlign = (options?.align as CanvasTextAlign) || "left";

    // jsPDF text y is the baseline.
    ctx.textBaseline = "alphabetic";

    ctx.fillText(text, this.mmToPx(x), this.mmToPx(y));
  }

  splitTextToSize(text: string, maxW: number): string[] {
    // Rough simulation of splitTextToSize
    const ctx = this.ctx;
    this.updateCtxFont(ctx);
    const pxMaxW = this.mmToPx(maxW);

    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const p of paragraphs) {
      if (p === '') {
        lines.push('');
        continue;
      }
      // split by word including punctuation
      const words = p.match(/[\w.,!?;:'"()-]+|[\s]+|./g) || [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > pxMaxW && currentLine.trim() !== "") {
          lines.push(currentLine.replace(/\s+$/, '')); // push current line without trailing space
          currentLine = word; // start new line with current word/space
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine.replace(/\s+$/, ''));
      }
    }
    return lines;
  }

  async addImage(dataUrl: string, format: string, x: number, y: number, w: number, h: number): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ctx = this.ctx;
        ctx.drawImage(img, this.mmToPx(x), this.mmToPx(y), this.mmToPx(w), this.mmToPx(h));
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
  }

  getNumberOfPages(): number {
    return this.canvases.length;
  }

  setPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.canvases.length) {
      this.currentPage = pageNumber - 1;
    }
  }

  async save(filename: string): Promise<void> {
    // Combine all canvases vertically
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = this.canvases[0].width;
    finalCanvas.height = this.canvases.reduce((sum, c) => sum + c.height, 0);
    const ctx = finalCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create final canvas context");

    let currentY = 0;
    for (const c of this.canvases) {
      ctx.drawImage(c, 0, currentY);
      currentY += c.height;
    }

    const dataUrl = finalCanvas.toDataURL("image/jpeg", 0.9);

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
