import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import 'multer';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    this.logger.log(`Uploads directory: ${this.uploadsDir}`);
  }

  async saveDocument(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new Error('No file received');
    }
    
    if (!file.buffer || !(file.buffer instanceof Buffer)) {
      this.logger.error('Invalid file buffer', { 
        hasBuffer: !!file.buffer,
        bufferType: file.buffer ? typeof file.buffer : 'undefined',
        fileKeys: Object.keys(file)
      });
      throw new Error('Invalid file buffer');
    }
    
    const timestamp = Date.now();
    const filename = `document_${timestamp}.docx`;
    const filePath = path.join(this.uploadsDir, filename);
    
    this.logger.log(`Saving document to: ${filePath}`);
    this.logger.log(`File buffer size: ${file.buffer.length} bytes`);
    
    try {
      // Save the file
      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`File saved successfully`);
      return filename;
    } catch (error) {
      this.logger.error(`Error saving file: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDocument(filename: string): Promise<Buffer> {
    const filePath = path.join(this.uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found: ${filePath}`);
      throw new Error(`File ${filename} not found`);
    }
    
    try {
      // Read and return the file
      const buffer = fs.readFileSync(filePath);
      this.logger.log(`File read successfully: ${filePath}, size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      this.logger.error(`Error reading file: ${error.message}`, error.stack);
      throw error;
    }
  }

  getLatestDocument(): string | null {
    if (!fs.existsSync(this.uploadsDir)) {
      this.logger.warn(`Uploads directory does not exist: ${this.uploadsDir}`);
      return null;
    }
    
    try {
      const files = fs.readdirSync(this.uploadsDir)
        .filter(file => file.endsWith('.docx'))
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(this.uploadsDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      if (files.length === 0) {
        this.logger.log('No documents found');
        return null;
      }
      
      this.logger.log(`Latest document: ${files[0].name}`);
      return files.length > 0 ? files[0].name : null;
    } catch (error) {
      this.logger.error(`Error getting latest document: ${error.message}`, error.stack);
      return null;
    }
  }
} 