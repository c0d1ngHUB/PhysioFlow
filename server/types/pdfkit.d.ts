declare module 'pdfkit' {
  interface TextOptions {
    align?: 'left' | 'center' | 'right' | 'justify';
    width?: number;
  }

  interface ImageOptions {
    width?: number;
  }

  interface PDFDocumentOptions {
    margin?: number;
  }

  export default class PDFDocument {
    y: number;

    constructor(options?: PDFDocumentOptions);
    pipe(destination: NodeJS.WritableStream): this;
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: TextOptions): this;
    text(text: string, x: number, y?: number, options?: TextOptions): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    image(src: Buffer, x?: number, y?: number, options?: ImageOptions): this;
    end(): void;
  }
}
