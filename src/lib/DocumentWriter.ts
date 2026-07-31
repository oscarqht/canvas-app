export interface DocumentWriter {
  addPage(): void;
  setFillColor(r: number, g: number, b: number): void;
  rect(x: number, y: number, w: number, h: number, style: string): void;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style: string): void;
  setDrawColor(r: number, g: number, b: number): void;
  setLineWidth(width: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  setFont(fontName: string, fontStyle: string): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  text(text: string, x: number, y: number, options?: { align?: string }): void;
  splitTextToSize(text: string, maxW: number): string[];
  addImage(dataUrl: string, format: string, x: number, y: number, w: number, h: number): Promise<void>;
  getNumberOfPages(): number;
  setPage(pageNumber: number): void;
  save(filename: string): Promise<void>;
}
