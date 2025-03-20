import React from 'react';
import { SidebarItem } from './SidebarItem';

interface ActionItem {
  id: string;
  title: string;
}

interface SidebarProps {
  items: ActionItem[];
  onItemClick?: (item: ActionItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  items, 
  onItemClick 
}) => {
  const handleItemClick = (item: ActionItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <div className="h-full w-64 bg-gray-100 p-4 border-r border-gray-200">
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Actions</h2>
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarItem 
            key={item.id}
            title={item.title} 
            onClick={() => handleItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
}; 