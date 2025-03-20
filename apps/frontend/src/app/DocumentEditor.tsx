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
import { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClauseSelector } from './components/ClauseSelector';
import { ClauseRemovalToolbar } from './components/ClauseRemovalToolbar';
import { clauses } from '../assets/Clauses';
import { 
  ClauseInfo
} from '../utils/docxReader';
import {
  generateBookmarkId,
  fetchDocument,
  convertDocxToSfdt,
  insertFormattedText,
  createFormattedHtml
} from '../utils/documentUtils';

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

export const DocumentEditor = () => {
  const [isClauseSelectorOpen, setIsClauseSelectorOpen] = useState(false);
  const documentEditorRef = useRef<DocumentEditorContainerComponent>(null);
  const [isLoadingClause, setIsLoadingClause] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track added clauses
  const { clauses: addedClauses, setClauses: setAddedClauses } = useContext(DocumentContext);
  
  // Memoize action items array to prevent unnecessary re-renders
  const actionItems = useMemo<ActionItem[]>(() => [
    { id: '1', title: 'Add Clauses' },
    { id: '2', title: 'Save' },
  ], []);

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
      const blob = await documentEditorRef.current.documentEditor.saveAsBlob('Docx');
      
      // Create a FormData object and append the file
      const formData = new FormData();
      formData.append('file', blob, 'document.docx');
      
      console.log('Sending document to server...');
      
      // Send the file to the server
      const response = await fetch('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      
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

  /**
   * Synchronizes the document bookmarks with the React state bookmarks
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
   */
  const handleDocumentContentChange = (args: ContentChangeEventArgs) => {
    // Use a timeout to ensure we check after the document has been fully updated
    setTimeout(() => {
      syncBookmarksWithState();
    }, 100);
  };

  const handleActionItemClick = (item: ActionItem) => {
    console.log('Action item clicked:', item);
    
    if (item.id === '1') {
      setIsClauseSelectorOpen(true);
    } else if (item.id === '2') {
      saveDocument();
    }
  };

  /**
   * Directly adds a bookmark using Syncfusion's API
   */
  const addBookmarkAtCursor = (name: string) => {
    if (!documentEditorRef.current) return;
    
    const documentEditor = documentEditorRef.current.documentEditor;
    documentEditor.editor.insertBookmark(name);
  };

  /**
   * Handles removing a clause from the document
   */
  const handleRemoveClause = async (clauseId: string, bookmarkId: string) => {
    if (!documentEditorRef.current) return;
    
    console.log('Removing clause:', clauseId, bookmarkId);
    
    const documentEditor = documentEditorRef.current.documentEditor;
    
    try {
      const bookmarks = documentEditor.getBookmarks();
      
      if (bookmarks.includes(bookmarkId)) {
        documentEditor.selection.selectBookmark(bookmarkId);
        
        console.log('Selected bookmark content range:', 
          documentEditor.selection.start, documentEditor.selection.end);
        
        // Delete just the selected content (the content inside the bookmark)
        documentEditor.editor.delete();
        documentEditor.editor.deleteBookmark(bookmarkId);
        
        // Update the state to remove the clause
        setAddedClauses(prevClauses => 
          prevClauses.filter(clause => clause.bookmarkId !== bookmarkId)
        );
        
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
      const bookmarkId = generateBookmarkId(clauseId);
      console.log('Generated bookmark ID:', bookmarkId);
      
      const position = documentEditor.selection.startOffset.toString();
      const startPositionOffset = documentEditor.selection.startOffset;
      
      // 1. Insert the clause title (formatted)
      const formattedHtml = createFormattedHtml(clause.name, true, true);
      const sfdtData = await insertFormattedText(formattedHtml, documentEditor.serviceUrl);
      documentEditor.editor.paste(sfdtData);
      
      // 2. Insert a paragraph break
      documentEditor.editor.insertText('\n');
      
      // 3. Insert the clause content
      const blob = await fetchDocument(clauseDocxPath);
      const docxSfdtData = await convertDocxToSfdt(blob, documentEditor.serviceUrl);
      documentEditor.editor.paste(docxSfdtData);
      
      // Save where the clause content ends
      const endPositionOffset = documentEditor.selection.startOffset;
      
      // 4. Insert a paragraph break after content (outside the bookmark)
      documentEditor.editor.insertText('\n\n');
      
      // Select the exact content we want to bookmark
      // First select from the start to end position using the precise hierarchical indices
      documentEditor.selection.select(startPositionOffset, endPositionOffset);
      documentEditor.editor.insertBookmark(bookmarkId);
      
      documentEditor.selection.moveToLineEnd();
      
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

  // Initialize document settings when component mounts
  useEffect(() => {
    if (documentEditorRef.current) {
      documentEditorRef.current.documentEditor.contentChange = handleDocumentContentChange;

      // Set up document open listener
      documentEditorRef.current.documentEditor.documentChange = () => {
        setTimeout(() => {
          detectClausesFromBookmarks();
        }, 500);
      };
      
      loadLatestDocument();
    }
    // Intentionally omit dependencies to avoid infinite loops
    // This effect should only run once on component mount
  }, []);

  useEffect(() => {
    if (addedClauses.length === 0) return;

    const intervalId = setInterval(() => {
      syncBookmarksWithState();
    }, 3000); 
    
    return () => clearInterval(intervalId);
  }, [addedClauses.length]);

  // Memoize the loading overlay
  const loadingOverlay = useMemo(() => {
    if (!(isLoadingClause || isSaving || isLoading)) return null;
    
    return (
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-20 z-50">
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <p className="text-gray-700">
            {isLoadingClause ? 'Loading clause content...' : 
             isSaving ? 'Saving document...' : 'Loading document...'}
          </p>
        </div>
      </div>
    );
  }, [isLoadingClause, isSaving, isLoading]);

  // Memoize the document editor toolbar items
  const toolbarItems = useMemo(() => ([
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
  ] as any[]), []);

  return (
    <>
      <div className="flex h-screen bg-gray-300">
        <Sidebar items={actionItems} onItemClick={handleActionItemClick} />
        <div className="flex-1 px-6 pt-12 flex">
          {loadingOverlay}
          <div className="flex-1">
            <DocumentEditorContainerComponent
              ref={documentEditorRef}
              height="calc(100vh - 125px)"
              serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/documenteditor/"
              enableToolbar={true}
              showPropertiesPane={false}
              toolbarItems={toolbarItems}
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
