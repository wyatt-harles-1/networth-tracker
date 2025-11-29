import { supabase } from '@/lib/supabase';

export interface TextExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  pageCount?: number;
}

export class FileProcessingService {
  private static readonly STORAGE_BUCKET = 'statement-uploads';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'message/rfc822',
  ];

  static async validateFile(
    file: File
  ): Promise<{ valid: boolean; error?: string }> {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    if (
      !this.ALLOWED_TYPES.includes(file.type) &&
      !this.isAllowedExtension(file.name)
    ) {
      return {
        valid: false,
        error:
          'File type not supported. Please upload PDF, CSV, XLSX, TXT, or EML files.',
      };
    }

    return { valid: true };
  }

  private static isAllowedExtension(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ['pdf', 'txt', 'csv', 'xls', 'xlsx', 'eml'].includes(ext || '');
  }

  static async uploadToStorage(
    file: File,
    userId: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}-${file.name}`;

      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, path: data.path };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  static async downloadFromStorage(
    filePath: string
  ): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        console.error('Storage download error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  static async deleteFromStorage(
    filePath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Storage delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  static async extractText(file: File): Promise<TextExtractionResult> {
    try {
      const fileType = file.type || this.guessTypeFromExtension(file.name);

      switch (fileType) {
        case 'application/pdf':
          return await this.extractFromPDF(file);
        case 'text/plain':
          return await this.extractFromText(file);
        case 'text/csv':
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.extractFromCSV(file);
        case 'message/rfc822':
          return await this.extractFromEmail(file);
        default:
          return await this.extractFromText(file);
      }
    } catch (error) {
      return {
        success: false,
        text: '',
        error:
          error instanceof Error ? error.message : 'Text extraction failed',
      };
    }
  }

  private static guessTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const typeMap: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      csv: 'text/csv',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      eml: 'message/rfc822',
    };
    return typeMap[ext || ''] || 'text/plain';
  }

  private static async extractFromText(
    file: File
  ): Promise<TextExtractionResult> {
    try {
      const text = await file.text();
      return { success: true, text };
    } catch (error) {
      return {
        success: false,
        text: '',
        error:
          error instanceof Error ? error.message : 'Failed to read text file',
      };
    }
  }

  private static async extractFromCSV(
    file: File
  ): Promise<TextExtractionResult> {
    try {
      const text = await file.text();
      return { success: true, text };
    } catch (error) {
      return {
        success: false,
        text: '',
        error:
          error instanceof Error ? error.message : 'Failed to read CSV file',
      };
    }
  }

  private static async extractFromPDF(
    file: File
  ): Promise<TextExtractionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await this.extractPDFText(arrayBuffer);

      return {
        success: true,
        text,
        pageCount: 1,
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error:
          error instanceof Error ? error.message : 'Failed to extract PDF text',
      };
    }
  }

  private static async extractPDFText(
    arrayBuffer: ArrayBuffer
  ): Promise<string> {
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8');
    let text = textDecoder.decode(uint8Array);

    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');

    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    const extractedText: string[] = [];

    while ((match = streamRegex.exec(text)) !== null) {
      const streamContent = match[1];
      const readable = streamContent.replace(/[^\x20-\x7E\n\r\t]/g, '');
      if (readable.length > 10) {
        extractedText.push(readable);
      }
    }

    return extractedText.length > 0 ? extractedText.join('\n') : text;
  }

  private static async extractFromEmail(
    file: File
  ): Promise<TextExtractionResult> {
    try {
      const text = await file.text();

      const bodyMatch = text.match(/\r?\n\r?\n([\s\S]+)$/);
      const body = bodyMatch ? bodyMatch[1] : text;

      return { success: true, text: body };
    } catch (error) {
      return {
        success: false,
        text: '',
        error:
          error instanceof Error
            ? error.message
            : 'Failed to extract email content',
      };
    }
  }

  static getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || '';
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
