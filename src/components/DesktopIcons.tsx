import React from 'react';
import { Folder, Trash2, Home, FileText, Image as ImageIcon, Music } from 'lucide-react';

interface DesktopIconsProps {
  onOpenFolder: (folderName: string) => void;
  selectedIcon: string | null;
  onSelectIcon: (iconName: string) => void;
}

export const DesktopIcons: React.FC<DesktopIconsProps> = ({
  onOpenFolder,
  selectedIcon,
  onSelectIcon
}) => {
  const items = [
    {
      id: 'home',
      name: 'Home',
      y: 85,
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 shadow-md flex items-center justify-center text-white relative">
          <Folder className="w-9 h-9 fill-white/20 text-white" />
          <Home className="w-4 h-4 text-white absolute bottom-2" />
        </div>
      )
    },
    {
      id: 'documents',
      name: 'Documents',
      y: 183,
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 shadow-md flex items-center justify-center text-white relative">
          <Folder className="w-9 h-9 fill-white/20 text-white" />
          <FileText className="w-4 h-4 text-white/90 absolute bottom-2" />
        </div>
      )
    },
    {
      id: 'pictures',
      name: 'Pictures',
      y: 278,
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 shadow-md flex items-center justify-center text-white relative">
          <Folder className="w-9 h-9 fill-white/20 text-white" />
          <ImageIcon className="w-4 h-4 text-white/90 absolute bottom-2" />
        </div>
      )
    },
    {
      id: 'music',
      name: 'Music',
      y: 376,
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 shadow-md flex items-center justify-center text-white relative">
          <Folder className="w-9 h-9 fill-white/20 text-white" />
          <Music className="w-4 h-4 text-white/90 absolute bottom-2" />
        </div>
      )
    },
    {
      id: 'trash',
      name: 'Trash',
      y: 475,
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-slate-100 to-slate-200 border border-white/60 shadow-md flex items-center justify-center text-sky-600">
          <Trash2 className="w-6 h-6 stroke-[1.8]" />
        </div>
      )
    }
  ];

  return (
    <div className="absolute left-[37px] top-0 pointer-events-auto">
      {items.map((item) => {
        const isSelected = selectedIcon === item.id;
        return (
          <div
            key={item.id}
            style={{ top: `${item.y}px` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIcon(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenFolder(item.name);
            }}
            className={`absolute w-[72px] flex flex-col items-center cursor-pointer p-1 rounded-lg transition-colors group ${
              isSelected ? 'bg-blue-500/20 ring-1 ring-blue-400/40 backdrop-blur-xs' : 'hover:bg-white/15'
            }`}
          >
            <div className="transition-transform group-hover:scale-105 duration-150">
              {item.icon}
            </div>
            <span
              className={`mt-1.5 text-[13px] font-medium tracking-tight text-center leading-none px-1.5 py-0.5 rounded ${
                isSelected ? 'bg-blue-600 text-white' : 'text-slate-800 drop-shadow-xs'
              }`}
            >
              {item.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
