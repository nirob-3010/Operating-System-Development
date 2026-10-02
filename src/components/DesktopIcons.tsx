import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Home, FileText, Image as ImageIcon, Music } from 'lucide-react';
import folderArtwork from '../assets/file.jpeg';

interface DesktopIconsProps {
  onOpenFolder: (folderPath: string) => void;
  selectedIcon: string | null;
  onSelectIcon: (iconName: string | null) => void;
}

interface DesktopItem {
  id: string;
  name: string;
  path: string;
  x: number;
  y: number;
  icon: React.ReactNode;
}

export const DesktopIcons: React.FC<DesktopIconsProps> = ({
  onOpenFolder,
  selectedIcon,
  onSelectIcon,
}) => {
  const [items, setItems] = useState<DesktopItem[]>([
    {
      id: 'home',
      name: 'Home',
      path: '/home',
      x: 28,
      y: 20,
      icon: (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center relative group">
          <img src={folderArtwork} alt="Home" className="w-12 h-12 object-contain drop-shadow-md select-none" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Home className="w-3 h-3 text-white" />
          </div>
        </div>
      ),
    },
    {
      id: 'documents',
      name: 'Documents',
      path: '/home/Documents',
      x: 28,
      y: 110,
      icon: (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center relative group">
          <img src={folderArtwork} alt="Documents" className="w-12 h-12 object-contain drop-shadow-md select-none" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-3 h-3 text-white" />
          </div>
        </div>
      ),
    },
    {
      id: 'pictures',
      name: 'Pictures',
      path: '/home/Pictures',
      x: 28,
      y: 200,
      icon: (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center relative group">
          <img src={folderArtwork} alt="Pictures" className="w-12 h-12 object-contain drop-shadow-md select-none" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <ImageIcon className="w-3 h-3 text-white" />
          </div>
        </div>
      ),
    },
    {
      id: 'music',
      name: 'Music',
      path: '/home/Music',
      x: 28,
      y: 290,
      icon: (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center relative group">
          <img src={folderArtwork} alt="Music" className="w-12 h-12 object-contain drop-shadow-md select-none" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <Music className="w-3 h-3 text-white" />
          </div>
        </div>
      ),
    },
    {
      id: 'trash',
      name: 'Trash',
      path: '/home/Trash',
      x: 28,
      y: 380,
      icon: (
        <div className="w-12 h-12 rounded-xl bg-white/70 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform">
          <Trash2 className="w-6 h-6 stroke-[1.8]" />
        </div>
      ),
    },
  ]);

  // Dragging of desktop icons
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  const handleDragStart = (e: React.MouseEvent, item: DesktopItem) => {
    e.stopPropagation();
    onSelectIcon(item.id);
    setDraggingId(item.id);
    dragOffsetRef.current = {
      offsetX: e.clientX - item.x,
      offsetY: e.clientY - item.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 90, e.clientX - dragOffsetRef.current.offsetX));
      const newY = Math.max(10, Math.min(window.innerHeight - 150, e.clientY - dragOffsetRef.current.offsetY));

      setItems(prev =>
        prev.map(item => (item.id === draggingId ? { ...item, x: newX, y: newY } : item))
      );
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {items.map((item) => {
        const isSelected = selectedIcon === item.id;
        return (
          <div
            key={item.id}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
            }}
            onMouseDown={(e) => handleDragStart(e, item)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIcon(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenFolder(item.path);
            }}
            className={`absolute w-[76px] flex flex-col items-center cursor-pointer p-1.5 rounded-xl transition-colors pointer-events-auto select-none group ${
              isSelected
                ? 'bg-blue-500/25 ring-1 ring-blue-400/50 backdrop-blur-xs shadow-xs'
                : 'hover:bg-white/15'
            }`}
          >
            <div className="transition-transform group-hover:scale-105 duration-150">
              {item.icon}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium tracking-tight text-center leading-none px-1.5 py-0.5 rounded shadow-2xs ${
                isSelected ? 'bg-blue-600 text-white font-semibold' : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
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
