import React from 'react';
import { DocumentIcon } from '../icons/DocumentIcon';

interface SidebarItemProps {
  title: string;
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  title, 
  onClick = () => {} 
}) => {
  return (
    <button
      className="flex items-center w-full px-4 py-3 mb-2 text-left text-gray-700 bg-white rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={onClick}
    >
      <span className="mr-3 text-gray-500">
        <DocumentIcon />
      </span>
      <span className="font-medium">{title}</span>
    </button>
  );
}; 