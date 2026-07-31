import { jsPDF } from "jspdf";
import { DocumentWriter } from "./DocumentWriter";

export class PdfWriter implements DocumentWriter {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  }

  get rawDoc() {
    return this.doc;
  }

  addPage(): void {
    this.doc.addPage();
  }

  setFillColor(r: number, g: number, b: number): void {
    this.doc.setFillColor(r, g, b);
  }

  rect(x: number, y: number, w: number, h: number, style: string): void {
    this.doc.rect(x, y, w, h, style);
  }

  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style: string): void {
    this.doc.roundedRect(x, y, w, h, rx, ry, style);
  }

  setDrawColor(r: number, g: number, b: number): void {
    this.doc.setDrawColor(r, g, b);
  }

  setLineWidth(width: number): void {
    this.doc.setLineWidth(width);
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    this.doc.line(x1, y1, x2, y2);
  }

  setFont(fontName: string, fontStyle: string): void {
    this.doc.setFont(fontName, fontStyle);
  }

  setFontSize(size: number): void {
    this.doc.setFontSize(size);
  }

  setTextColor(r: number, g: number, b: number): void {
    this.doc.setTextColor(r, g, b);
  }

  text(text: string, x: number, y: number, options?: { align?: string }): void {
    this.doc.text(text, x, y, options as Parameters<jsPDF["text"]>[3]);
  }

  splitTextToSize(text: string, maxW: number): string[] {
    return this.doc.splitTextToSize(text, maxW) as string[];
  }

  async addImage(dataUrl: string, format: string, x: number, y: number, w: number, h: number): Promise<void> {
    try {
      this.doc.addImage(dataUrl, format, x, y, w, h);
    } catch {
      try {
        this.doc.addImage(dataUrl, x, y, w, h);
      } catch {
        // skip broken images silently
      }
    }
  }

  getNumberOfPages(): number {
    return this.doc.getNumberOfPages();
  }

  setPage(pageNumber: number): void {
    this.doc.setPage(pageNumber);
  }

  async save(filename: string): Promise<void> {
    this.doc.save(filename);
  }
}
