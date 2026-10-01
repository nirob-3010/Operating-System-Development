import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Minus,
  Square,
  X,
  Folder,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Download,
  Settings,
  Trash2
} from 'lucide-react';

interface FileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  zIndex: number;
  onFocus: () => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  isOpen,
  onClose,
  onMinimize,
  zIndex,
  onFocus
}) => {
  const [pos, setPos] = useState({ x: 155, y: 152 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentFolder, setCurrentFolder] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<string[]>(['Home']);
  const [historyIdx, setHistoryIdx] = useState(0);

  if (!isOpen) return null;

  const navigateTo = (folder: string) => {
    const newHist = history.slice(0, historyIdx + 1);
    newHist.push(folder);
    setHistory(newHist);
    setHistoryIdx(newHist.length - 1);
    setCurrentFolder(folder);
  };

  const goBack = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setCurrentFolder(history[historyIdx - 1]);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setCurrentFolder(history[historyIdx + 1]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
    onFocus();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPos({
        x: Math.max(0, Math.min(900, e.clientX - dragOffset.x)),
        y: Math.max(36, Math.min(600, e.clientY - dragOffset.y))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const sidebarItems = [
    { name: 'Home', icon: Home },
    { name: 'Documents', icon: FileText },
    { name: 'Pictures', icon: ImageIcon },
    { name: 'Music', icon: Music },
    { name: 'Videos', icon: Video },
    { name: 'Downloads', icon: Download },
    { name: 'Settings', icon: Settings },
  ];

  const allItems: Record<string, { name: string; type: 'folder' | 'file'; icon: 'folder' | 'download' | 'trash' | 'doc' }[]> = {
    Home: [
      { name: 'Documents', type: 'folder', icon: 'folder' },
      { name: 'Pictures', type: 'folder', icon: 'folder' },
      { name: 'Music', type: 'folder', icon: 'folder' },
      { name: 'Videos', type: 'folder', icon: 'folder' },
      { name: 'Downloads', type: 'folder', icon: 'download' },
      { name: 'Trash', type: 'folder', icon: 'trash' },
    ],
    Documents: [
      { name: 'welcome_to_nsk.txt', type: 'file', icon: 'doc' },
      { name: 'kernel_specs_v0.3.md', type: 'file', icon: 'doc' },
      { name: 'phase1_complete.log', type: 'file', icon: 'doc' },
    ],
    Pictures: [
      { name: 'wallpaper_wave.png', type: 'file', icon: 'doc' },
      { name: 'mockup_1536x1024.png', type: 'file', icon: 'doc' },
    ],
    Music: [
      { name: 'ambient_soundtrack.mp3', type: 'file', icon: 'doc' },
    ],
    Videos: [],
    Downloads: [
      { name: 'nsk-os-0.3.iso', type: 'file', icon: 'doc' },
      { name: 'grub-2.06.tar.gz', type: 'file', icon: 'doc' },
    ],
    Settings: [],
    Trash: []
  };

  const currentItems = (allItems[currentFolder] || []).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '633px',
        height: '409px',
        zIndex
      }}
      onClick={onFocus}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="absolute bg-white/92 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl flex flex-col overflow-hidden select-none"
    >
      {/* Title Bar (y152-188) */}
      <div
        onMouseDown={handleMouseDown}
        className="h-9 px-4 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-b from-white/90 to-white/60 cursor-move"
      >
        {/* Left: Traffic light buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-90 transition-all flex items-center justify-center group"
          >
            <X className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-90 transition-all flex items-center justify-center group"
          >
            <Minus className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-90 transition-all"
          />
        </div>

        {/* Center: Title */}
        <span className="text-[13px] font-semibold text-slate-700 tracking-tight">
          File Manager
        </span>

        {/* Right: Window Controls matching mockup */}
        <div className="flex items-center gap-3 text-slate-500">
          <button onClick={onMinimize} className="hover:text-slate-800 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-slate-800 transition-colors">
            <Square className="w-3 h-3" />
          </button>
          <button onClick={onClose} className="hover:text-slate-800 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar (y194-226) */}
      <div className="h-10 px-4 flex items-center gap-3 border-b border-slate-200/60 bg-white/40">
        <div className="flex items-center gap-1 text-slate-600">
          <button
            onClick={goBack}
            disabled={historyIdx === 0}
            className={`p-1 rounded hover:bg-slate-200/60 transition-colors ${historyIdx === 0 ? 'opacity-40' : ''}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIdx >= history.length - 1}
            className={`p-1 rounded hover:bg-slate-200/60 transition-colors ${historyIdx >= history.length - 1 ? 'opacity-40' : ''}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Path Box */}
        <div className="flex-1 max-w-[280px] h-7 bg-white/80 border border-slate-200/80 rounded-md px-2.5 flex items-center gap-2 text-xs text-slate-700 shadow-2xs">
          <Home className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-sans font-medium text-slate-600">/{currentFolder.toLowerCase()}</span>
        </div>

        {/* Search Box */}
        <div className="w-[190px] h-7 bg-white/80 border border-slate-200/80 rounded-md px-2.5 flex items-center gap-2 text-xs text-slate-500 shadow-2xs ml-auto">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Body: Sidebar + Content Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[146px] border-r border-slate-200/60 p-2 space-y-1 bg-white/30 text-xs">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentFolder === item.name;
            return (
              <button
                key={item.name}
                onClick={() => navigateTo(item.name)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#5BA0F2] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-black/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Grid */}
        <div className="flex-1 p-5 overflow-auto">
          {currentItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
              This folder is empty
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {currentItems.map((item) => (
                <div
                  key={item.name}
                  onDoubleClick={() => {
                    if (item.type === 'folder' && item.name !== 'Trash') {
                      navigateTo(item.name);
                    }
                  }}
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-blue-500/10 cursor-pointer group transition-all"
                >
                  {/* Folder / File Icon */}
                  {item.icon === 'trash' ? (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs group-hover:scale-105 transition-transform">
                      <Trash2 className="w-6 h-6 stroke-[1.8]" />
                    </div>
                  ) : item.icon === 'download' ? (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-xs relative group-hover:scale-105 transition-transform">
                      <Folder className="w-9 h-9 fill-white/20 text-white" />
                      <Download className="w-4 h-4 text-white absolute bottom-2" />
                    </div>
                  ) : item.type === 'folder' ? (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                      <Folder className="w-9 h-9 fill-white/20 text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-105 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}

                  <span className="mt-2 text-xs font-medium text-slate-800 text-center tracking-tight truncate max-w-[90px]">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
