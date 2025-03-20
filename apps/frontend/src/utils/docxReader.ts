/**
 * Gets the relative path for a clause file
 * @param fileName - The name of the clause file
 * @returns The relative path to the clause file
 */
export function getClauseFilePath(fileName: string): string {
  // Return the path to the file in the public directory
  return `/assets/Clauses/${fileName}`;
}

import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from 'xmldom';

/**
 * Interface representing a clause in the document
 */
export interface ClauseInfo {
  id: string;
  name: string;
  position: string; // Position in document (can be a string)
  bookmarkId: string; // Unique ID for locating in document
}

/**
 * Parses a DOCX file as a ZIP archive and extracts its XML content
 * @param docxBlob - The DOCX file as a Blob
 * @returns A Promise that resolves to the document.xml content
 */
export async function parseDocxAsXml(docxBlob: Blob): Promise<string> {
  try {
    const zip = new JSZip();
    const docxZip = await zip.loadAsync(docxBlob);
    
    // The main document content is in word/document.xml
    const documentXml = await docxZip.file('word/document.xml')?.async('string');
    
    if (!documentXml) {
      throw new Error('Could not find document.xml in the DOCX file');
    }
    
    return documentXml;
  } catch (error) {
    console.error('Error parsing DOCX file:', error);
    throw error;
  }
}

/**
 * Generates a unique bookmark ID for a clause
 * @param clauseId - The ID of the clause
 * @returns A unique bookmark ID
 */
export function generateBookmarkId(clauseId: string): string {
  return `clause_${clauseId}`;
}

/**
 * Injects custom XML tags to mark a clause in a document
 * @param xmlContent - The XML content of the document
 * @param clauseId - The ID of the clause
 * @param clauseName - The name of the clause
 * @param bookmarkId - The bookmark ID to use
 * @returns The modified XML content with custom clause tags
 */
export function injectClauseMarkers(xmlContent: string, clauseId: string, clauseName: string, bookmarkId: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Find the document body
    const body = xmlDoc.getElementsByTagName('w:body')[0];
    if (!body) {
      throw new Error('Could not find document body in XML');
    }
    
    // Find all paragraph elements
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    if (paragraphs.length === 0) {
      throw new Error('Could not find paragraphs in XML');
    }
    
    // Create bookmark start and end tags
    // In Word XML, bookmarks are defined with w:bookmarkStart and w:bookmarkEnd elements
    const bookmarkStart = xmlDoc.createElement('w:bookmarkStart');
    bookmarkStart.setAttribute('w:id', bookmarkId);
    bookmarkStart.setAttribute('w:name', bookmarkId);
    
    const bookmarkEnd = xmlDoc.createElement('w:bookmarkEnd');
    bookmarkEnd.setAttribute('w:id', bookmarkId);
    
    // Insert bookmark start before the first paragraph and end after the last paragraph
    // This way we wrap the entire content with our bookmark
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0];
      const lastPara = paragraphs[paragraphs.length - 1];
      
      firstPara.parentNode?.insertBefore(bookmarkStart, firstPara);
      lastPara.parentNode?.insertBefore(bookmarkEnd, lastPara.nextSibling);
    } else {
      // Fallback to adding at beginning and end of body
      body.insertBefore(bookmarkStart, body.firstChild);
      body.appendChild(bookmarkEnd);
    }
    
    // Serialize back to XML string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  } catch (error) {
    console.error('Error injecting clause markers:', error);
    throw error;
  }
}

/**
 * Converts modified XML content back to a DOCX file
 * @param xmlContent - The modified XML content
 * @param originalDocxBlob - The original DOCX file as a Blob
 * @returns A Promise that resolves to a Blob containing the modified DOCX file
 */
export async function createModifiedDocx(xmlContent: string, originalDocxBlob: Blob): Promise<Blob> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(originalDocxBlob);
    
    // Replace the document.xml file with our modified version
    zip.file('word/document.xml', xmlContent);
    
    // Generate the modified DOCX file
    return await zip.generateAsync({ type: 'blob' });
  } catch (error) {
    console.error('Error creating modified DOCX file:', error);
    throw error;
  }
}

/**
 * Processes a DOCX file to add clause markers
 * @param docxBlob - The DOCX file as a Blob
 * @param clauseId - The ID of the clause
 * @param clauseName - The name of the clause
 * @param bookmarkId - The bookmark ID to use
 * @returns A Promise that resolves to a Blob containing the modified DOCX file
 */
export async function processDocxWithClauseMarkers(
  docxBlob: Blob,
  clauseId: string,
  clauseName: string,
  bookmarkId: string
): Promise<Blob> {
  try {
    // Parse the DOCX file as XML
    const xmlContent = await parseDocxAsXml(docxBlob);
    
    // Inject clause markers into the XML
    const modifiedXml = injectClauseMarkers(xmlContent, clauseId, clauseName, bookmarkId);
    
    // Convert the modified XML back to a DOCX file
    return await createModifiedDocx(modifiedXml, docxBlob);
  } catch (error) {
    console.error('Error processing DOCX with clause markers:', error);
    throw error;
  }
} 