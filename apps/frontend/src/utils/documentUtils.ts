/**
 * Generates a unique bookmark ID for a clause
 */
export function generateBookmarkId(clauseId: string): string {
  return `clause_${clauseId}`;
}

/**
 * Fetches a document file from the specified URL
 * @param url The URL to fetch the document from
 * @returns A Promise that resolves to a Blob
 */
export const fetchDocument = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.blob();
};

/**
 * Converts a DOCX file to SFDT format using Syncfusion service
 * @param blob The DOCX file as a Blob
 * @param serviceUrl The Syncfusion service URL
 * @returns A Promise that resolves to the SFDT data
 */
export const convertDocxToSfdt = async (blob: Blob, serviceUrl: string): Promise<any> => {
  const formData = new FormData();
  formData.append('files', blob, 'clause.docx');
  
  const response = await fetch(`${serviceUrl}Import`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};

/**
 * Inserts formatted HTML text at the current cursor position by converting it to SFDT
 * @param html The HTML string to insert
 * @param serviceUrl The Syncfusion service URL
 * @returns A Promise that resolves to the SFDT data
 */
export const insertFormattedText = async (html: string, serviceUrl: string): Promise<any> => {
  const response = await fetch(`${serviceUrl}SystemClipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: html, type: '.html' })
  });
  
  return response.json();
};

/**
 * Creates an HTML string with the specified text and formatting
 * @param text The text to format
 * @param underline Whether to apply underline formatting
 * @param uppercase Whether to convert text to uppercase
 * @returns An HTML string with the formatted text
 */
export const createFormattedHtml = (text: string, underline: boolean = false, uppercase: boolean = false): string => {
  let formattedText = text;
  
  if (uppercase) {
    formattedText = formattedText.toUpperCase();
  }
  
  let html = `<p>${underline ? `<u>${formattedText}</u>` : formattedText}</p>`;
  return html;
}; 