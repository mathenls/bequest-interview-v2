import {
  DocumentEditorContainerComponent,
  Toolbar,
  Selection,
  Editor,
  SfdtExport,
  WordExport,
  EditorHistory,
  ContextMenu,
  ContentChangeEventArgs
} from '@syncfusion/ej2-react-documenteditor';
import { registerLicense } from '@syncfusion/ej2-base';
import { useState, useRef, useEffect, useContext } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClauseSelector } from './components/ClauseSelector';
import { ClauseRemovalToolbar } from './components/ClauseRemovalToolbar';
import { clauses } from '../assets/Clauses';
import { 
  getClauseFilePath, 
  ClauseInfo
} from '../utils/docxReader';

// Style imports
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import { DocumentContext } from './app';

// Initialize document editor with required modules
DocumentEditorContainerComponent.Inject(Toolbar, Selection, Editor, SfdtExport, WordExport, EditorHistory, ContextMenu);
registerLicense(
  'Ngo9BigBOggjHTQxAR8/V1NMaF1cXmhNYVJ2WmFZfVtgdV9DZVZUTGYuP1ZhSXxWdkZiWH9fdXJVR2BaWEE='
);

// Define the ActionItem interface
interface ActionItem {
  id: string;
  title: string;
}

/**
 * Generates a unique bookmark ID for a clause
 */
function generateBookmarkId(clauseId: string): string {
  return `clause_${clauseId}`;
}

export const DocumentEditor = () => {
  const [isClauseSelectorOpen, setIsClauseSelectorOpen] = useState(false);
  const documentEditorRef = useRef<DocumentEditorContainerComponent>(null);
  const [isLoadingClause, setIsLoadingClause] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track added clauses
  const { clauses: addedClauses, setClauses: setAddedClauses } = useContext(DocumentContext);
  
  const [actionItems] = useState<ActionItem[]>([
    { id: '1', title: 'Add Clauses' },
    { id: '2', title: 'Save' },
  ]);

  // Initialize document settings when component mounts
  useEffect(() => {
    if (documentEditorRef.current) {
      // Enable bookmark visibility to help with debugging
      documentEditorRef.current.documentEditorSettings.showBookmarks = true;

      // Set up content change listener
      documentEditorRef.current.documentEditor.contentChange = handleDocumentContentChange;

      // Set up document open listener
      documentEditorRef.current.documentEditor.documentChange = () => {
        // When a document is opened, detect existing clauses
        setTimeout(() => {
          detectClausesFromBookmarks();
        }, 500);
      };
      
      // Try to load the latest document
      loadLatestDocument();
    }
  }, []);

  /**
   * Detects clauses from existing bookmarks in the document
   */
  const detectClausesFromBookmarks = () => {
    if (!documentEditorRef.current) return;
    
    const documentEditor = documentEditorRef.current.documentEditor;
    const bookmarks = documentEditor.getBookmarks();
    
    // Find all bookmarks that match our clause pattern (clause_*)
    const clauseBookmarks = bookmarks.filter(bookmark => bookmark.startsWith('clause_'));
    
    if (clauseBookmarks.length > 0) {
      console.log('Found existing clause bookmarks:', clauseBookmarks);
      
      // Extract the clauses from the bookmarks
      const detectedClauses = clauseBookmarks.map(bookmarkId => {
        // Extract clause ID from bookmark (remove 'clause_' prefix)
        const clauseId = bookmarkId.substring(7);
        
        // Find matching clause from predefined list
        const matchingClause = clauses.find(c => c.id === clauseId);
        
        return {
          id: clauseId,
          name: matchingClause?.name || `Clause ${clauseId}`,
          position: '0', // Default position
          bookmarkId
        };
      });
      
      // Update state with detected clauses
      setAddedClauses(detectedClauses);
    }
  };

  /**
   * Loads the latest document from the server
   */
  const loadLatestDocument = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3000/api/documents/latest/document');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        if (documentEditorRef.current) {
          documentEditorRef.current.documentEditor.open(url);
          // After document is loaded, detect existing clauses
          setTimeout(() => {
            detectClausesFromBookmarks();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error loading latest document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Saves the current document to the server
   */
  const saveDocument = async () => {
    if (!documentEditorRef.current) return;
    
    try {
      setIsSaving(true);
      
      // Export the document as a blob
      const blob = await documentEditorRef.current.documentEditor.saveAsBlob('Docx');
      console.log('Document exported as blob:', blob.size, 'bytes');
      
      // Create a FormData object and append the file
      const formData = new FormData();
      formData.append('file', blob, 'document.docx');
      
      console.log('Sending document to server...');
      
      // Send the file to the server
      const response = await fetch('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      
      console.log('Server response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Document saved successfully:', result);
        alert('Document saved successfully!');
      } else {
        const errorText = await response.text();
        console.error('Error saving document:', response.statusText, errorText);
        alert(`Error saving document: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving document:', error);
      alert(`Error saving document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add a periodic bookmark check to ensure sync
  useEffect(() => {
    // Skip this effect if no clauses are added yet
    if (addedClauses.length === 0) return;

    // Create an interval to periodically check bookmarks consistency
    const intervalId = setInterval(() => {
      syncBookmarksWithState();
    }, 3000); // Check every 3 seconds
    
    // Cleanup the interval when component unmounts or clauses change
    return () => clearInterval(intervalId);
  }, [addedClauses.length]); // Only recreate when the number of clauses changes

  /**
   * Synchronizes the document bookmarks with the React state bookmarks
   * This ensures that if a bookmark is deleted in the document editor,
   * it's also removed from the tracked clauses in the React state
   */
  const syncBookmarksWithState = () => {
    if (!documentEditorRef.current) return;
    
    const documentEditor = documentEditorRef.current.documentEditor;
    const currentBookmarks = documentEditor.getBookmarks();
    
    // Filter out any clauses whose bookmarks are no longer in the document
    setAddedClauses(prevClauses => {
      const clausesToRemove = prevClauses.filter(clause => 
        !currentBookmarks.includes(clause.bookmarkId)
      );
      
      if (clausesToRemove.length === 0) {
        return prevClauses;
      }
    
      console.log('Removed clauses with missing bookmarks:', clausesToRemove);
      
      return prevClauses.filter(clause => 
        currentBookmarks.includes(clause.bookmarkId)
      );
    });
    
    // Check if there are new clause bookmarks that should be added
    const existingBookmarkIds = addedClauses.map(clause => clause.bookmarkId);
    const newClauseBookmarks = currentBookmarks.filter(
      bookmark => bookmark.startsWith('clause_') && !existingBookmarkIds.includes(bookmark)
    );
    
    if (newClauseBookmarks.length > 0) {
      console.log('Found new clause bookmarks to add:', newClauseBookmarks);
      detectClausesFromBookmarks(); // Re-detect all clauses
    }
  };

  /**
   * Handles document content change events
   * @param args The content change event arguments
   */
  const handleDocumentContentChange = (args: ContentChangeEventArgs) => {
    // Use a timeout to ensure we check after the document has been fully updated
    setTimeout(() => {
      syncBookmarksWithState();
    }, 100);
  };

  /**
   * Fetches a document file from the specified URL
   * @param url The URL to fetch the document from
   * @returns A Promise that resolves to a Blob
   */
  const fetchDocument = async (url: string): Promise<Blob> => {
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
  const convertDocxToSfdt = async (blob: Blob, serviceUrl: string): Promise<any> => {
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
  const insertFormattedText = async (html: string, serviceUrl: string): Promise<any> => {
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
  const createFormattedHtml = (text: string, underline: boolean = false, uppercase: boolean = false): string => {
    let formattedText = text;
    
    if (uppercase) {
      formattedText = formattedText.toUpperCase();
    }
    
    let html = `<p>${underline ? `<u>${formattedText}</u>` : formattedText}</p>`;
    return html;
  };

  const handleActionItemClick = (item: ActionItem) => {
    console.log('Action item clicked:', item);
    
    // Open the clause selector when the "Add Clauses" button is clicked
    if (item.id === '1') {
      setIsClauseSelectorOpen(true);
    } else if (item.id === '2') {
      // Save the document when the "Save" button is clicked
      saveDocument();
    }
  };

  /**
   * Directly adds a bookmark using Syncfusion's API
   * @param name The name of the bookmark
   */
  const addBookmarkAtCursor = (name: string) => {
    if (!documentEditorRef.current) return;
    
    const documentEditor = documentEditorRef.current.documentEditor;
    documentEditor.editor.insertBookmark(name);
  };

  /**
   * Handles removing a clause from the document
   * @param clauseId The ID of the clause to remove
   * @param bookmarkId The bookmark ID for locating the clause in the document
   */
  const handleRemoveClause = async (clauseId: string, bookmarkId: string) => {
    if (!documentEditorRef.current) return;
    
    console.log('Removing clause:', clauseId, bookmarkId);
    
    const documentEditor = documentEditorRef.current.documentEditor;
    
    try {
      // Make sure bookmarks are visible
      documentEditorRef.current.documentEditorSettings.showBookmarks = true;
      
      // Log all available bookmarks for debugging
      const bookmarks = documentEditor.getBookmarks();
      console.log('Available bookmarks:', bookmarks);
      
      // Check if the bookmark exists
      if (bookmarks.includes(bookmarkId)) {
        documentEditor.selection.selectBookmark(bookmarkId);
        
        // Delete the selection (the content inside the bookmark)
        documentEditor.editor.delete();
        documentEditor.editor.deleteBookmark(bookmarkId);

        documentEditor.selection.moveToDocumentEnd();
        
        // Update the state to remove the clause
        setAddedClauses(prevClauses => 
          prevClauses.filter(clause => clause.bookmarkId !== bookmarkId)
        );
        
        // Verify the bookmark was actually removed
        setTimeout(() => {
          const updatedBookmarks = documentEditor.getBookmarks();
          if (updatedBookmarks.includes(bookmarkId)) {
            console.warn(`Failed to remove bookmark ${bookmarkId}. Trying again...`);
            documentEditor.editor.deleteBookmark(bookmarkId);
            
            // Force a state sync after the second attempt
            setTimeout(syncBookmarksWithState, 300);
          }
        }, 200);
      } else {
        console.error(`Bookmark with ID ${bookmarkId} not found in the document`);
        
        // Remove the clause from state even if bookmark isn't found
        setAddedClauses(prevClauses => 
          prevClauses.filter(clause => clause.bookmarkId !== bookmarkId)
        );
      }
    } catch (error) {
      console.error('Error removing clause:', error);
      
      // Sync state in case of error to ensure UI consistency
      setTimeout(syncBookmarksWithState, 500);
    }
  };

  const handleClauseSelect = async (clauseId: string, clauseDocxPath: string) => {
    const clause = clauses.find(c => c.id === clauseId);
    if (!documentEditorRef.current || !clause) return;
    
    setIsLoadingClause(true);
    const documentEditor = documentEditorRef.current.documentEditor;
    
    try {
      // Generate a unique bookmark ID for this clause
      const bookmarkId = generateBookmarkId(clauseId);
      console.log('Generated bookmark ID:', bookmarkId);
      
      const position = documentEditor.selection.startOffset.toString();
      const bookmarks = documentEditor.getBookmarks();
      
      if (!bookmarks.includes(bookmarkId)) {
        addBookmarkAtCursor(bookmarkId);
      }
      
      const formattedHtml = createFormattedHtml(clause.name, true, true);
      const sfdtData = await insertFormattedText(formattedHtml, documentEditor.serviceUrl);


      documentEditor.editor.paste(sfdtData);
      
      // Insert a paragraph break
      documentEditor.editor.insertText('\n\n');
      const blob = await fetchDocument(clauseDocxPath);
      
      const docxSfdtData = await convertDocxToSfdt(blob, documentEditor.serviceUrl);
      documentEditor.editor.paste(docxSfdtData);
      
      // Verify the bookmark was actually created and still exists after content insertion
      const updatedBookmarks = documentEditor.getBookmarks();
      if (!updatedBookmarks.includes(bookmarkId)) {
        console.warn(`Bookmark ${bookmarkId} was lost during content insertion, re-creating it`);
        addBookmarkAtCursor(bookmarkId);
      }
      
      // Add clause to tracked clauses
      const newClause: ClauseInfo = {
        id: clauseId,
        name: clause.name,
        position,
        bookmarkId
      };
      
      setAddedClauses(prevClauses => [...prevClauses, newClause]);
      
      // After a short delay, verify that the state and bookmarks are in sync
      setTimeout(() => {
        syncBookmarksWithState();
      }, 500);
    } catch (error) {
      console.error('Error inserting clause content:', error);
    } finally {
      setIsLoadingClause(false);
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-300">
        <Sidebar items={actionItems} onItemClick={handleActionItemClick} />
        <div className="flex-1 px-6 pt-12 flex">
          {(isLoadingClause || isSaving || isLoading) && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-20 z-50">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <p className="text-gray-700">
                  {isLoadingClause ? 'Loading clause content...' : 
                   isSaving ? 'Saving document...' : 'Loading document...'}
                </p>
              </div>
            </div>
          )}
          <div className="flex-1">
            <DocumentEditorContainerComponent
              ref={documentEditorRef}
              height="calc(100vh - 125px)"
              serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/documenteditor/"
              enableToolbar={true}
              showPropertiesPane={false}
              toolbarItems={[
                'New',
                'Open',
                'Separator',
                'Undo',
                'Redo',
                'Separator',
                'Bookmark',
                'Table',
                'Separator',
                'Find',
              ]}
            />
          </div>
          
          {/* Clause Removal Toolbar */}
          <ClauseRemovalToolbar 
            clauses={addedClauses} 
            onRemoveClause={handleRemoveClause} 
          />
        </div>
      </div>

      {/* Clause Selector Modal */}
      <ClauseSelector
        isOpen={isClauseSelectorOpen}
        onClose={() => setIsClauseSelectorOpen(false)}
        onSelectClause={handleClauseSelect}
      />
    </>
  );
};
