import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Res, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentService } from './document.service';
import { Express } from 'express';
import 'multer';

@Controller('documents')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.error('No file uploaded');
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Received file upload: ${file.originalname}, size: ${file.size} bytes`);
    
    try {
      const filename = await this.documentService.saveDocument(file);
      this.logger.log(`Document saved as: ${filename}`);
      return { success: true, filename };
    } catch (error) {
      this.logger.error(`Error saving document: ${error.message}`, error.stack);
      throw new HttpException(`Error saving document: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('latest/document')
  async getLatestDocument(@Res() res: Response) {
    this.logger.log('Request for latest document');
    
    try {
      const filename = this.documentService.getLatestDocument();
      
      if (!filename) {
        this.logger.warn('No documents found');
        throw new HttpException('No documents found', HttpStatus.NOT_FOUND);
      }
      
      this.logger.log(`Latest document: ${filename}`);
      const file = await this.documentService.getDocument(filename);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(file);
    } catch (error) {
      this.logger.error(`Error retrieving latest document: ${error.message}`, error.stack);
      throw new HttpException(`Error retrieving latest document: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':filename')
  async getDocument(@Param('filename') filename: string, @Res() res: Response) {
    this.logger.log(`Request for document: ${filename}`);
    
    try {
      const file = await this.documentService.getDocument(filename);
      this.logger.log(`Sending document: ${filename}, size: ${file.length} bytes`);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(file);
    } catch (error) {
      this.logger.error(`Error retrieving document: ${error.message}`, error.stack);
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }
  }
} 