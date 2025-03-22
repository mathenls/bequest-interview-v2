import React from 'react';
import { ClauseInfo } from '../../utils/docxReader';

interface ClauseRemovalToolbarProps {
  clauses: ClauseInfo[];
  onRemoveClause: (clauseId: string, bookmarkId: string) => void;
}

export const ClauseRemovalToolbar: React.FC<ClauseRemovalToolbarProps> = ({
  clauses,
  onRemoveClause,
}) => {
  return (
    <div className="w-64 bg-white shadow-md p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Document Clauses</h2>
      
      {clauses.length === 0 ? (
        <p className="text-sm text-gray-500">No clauses added yet.</p>
      ) : (
        <ul className="space-y-2">
          {clauses.map((clause) => (
            <li 
              key={clause.bookmarkId} 
              className="border border-gray-200 rounded-md p-3 text-sm"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{clause.name}</span>
                <button
                  onClick={() => onRemoveClause(clause.id, clause.bookmarkId)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Remove clause"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}; 