import React, { useState, useEffect, useContext } from 'react';
import { Modal } from './Modal';
import { clauses } from '../../assets/Clauses';
import { DocumentIcon } from '../icons/DocumentIcon';
import { ClauseInfo, getClauseFilePath } from '../../utils/docxReader';
import { DocumentContext } from '../app';

interface ClauseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClause: (clauseId: string, clauseDocxPath: string) => void;
}

export const ClauseSelector: React.FC<ClauseSelectorProps> = ({
  isOpen,
  onClose,
  onSelectClause,
}) => {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { clauses: addedClauses } = useContext(DocumentContext);

  // Reset state when modal is opened or closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedClauseId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSelectClause = () => {
    if (selectedClauseId) {
      setIsLoading(true);
      
      try {
        // Find the selected clause from the list
        const selectedClause = clauses.find(clause => clause.id === selectedClauseId);
        
        if (!selectedClause) {
          throw new Error('Selected clause not found');
        }

        // Get the clause file path
        const filePath = getClauseFilePath(selectedClause.file);
        
        // Pass the file path to the parent component
        onSelectClause(selectedClauseId, filePath);
        onClose();
      } catch (err) {
        console.error('Error selecting clause:', err);
        setError('Failed to select clause. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Clause to Document">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Select a clause template to add to your document.
        </p>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <div className="grid gap-3 max-h-[400px] overflow-y-auto">
          {clauses
          .filter(clause => !addedClauses.some((addedClause: ClauseInfo) => addedClause.id === clause.id))
          .map((clause) => (
            <div
              key={clause.id}
              className={`
                border rounded-lg p-3 cursor-pointer transition-all
                ${selectedClauseId === clause.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
              `}
              onClick={() => setSelectedClauseId(clause.id)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <span className="text-gray-500">
                    <DocumentIcon />
                  </span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">{clause.name}</h4>
                  <p className="mt-1 text-sm text-gray-600">{clause.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t mt-6">
          <button
            type="button"
            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md ${
              !selectedClauseId || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
            onClick={handleSelectClause}
            disabled={!selectedClauseId || isLoading}
          >
            {isLoading ? 'Loading...' : 'Add Clause'}
          </button>
        </div>
      </div>
    </Modal>
  );
}; 