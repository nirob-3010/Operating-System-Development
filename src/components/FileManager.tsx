import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Code,
  File,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';
import folderArtwork from '../assets/file.jpeg';

export interface FileItem {
  name: string;
  path: string;
  type: 'folder' | 'file';
  size: number;
  extension: string;
  modified: string;
}

interface FileManagerProps {
  initialPath?: string;
  onOpenFile?: (file: FileItem) => void;
}

// Initial Factory Baseline
const DEFAULT_FS: Record<string, { type: 'folder' | 'file'; size: number; modified: string; content?: string }> = {
  '/home': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Desktop': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Documents': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Downloads': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Pictures': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Music': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Videos': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Notes': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Applications': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Projects': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  '/home/Trash': { type: 'folder', size: 0, modified: '2026-10-02T10:00:00Z' },
  // Baseline files
  '/home/Documents/welcome_to_nsk.txt': {
    type: 'file',
    size: 248,
    modified: '2026-10-02T10:00:00Z',
    content: 'Welcome to NSK OS v0.3!\nA from-scratch 32-bit x86 Protected Mode operating system with custom kernel and glass desktop.',
  },
  '/home/Documents/kernel_specs_v0.3.md': {
    type: 'file',
    size: 512,
    modified: '2026-10-02T10:00:00Z',
    content: '# NSK OS v0.3 Kernel Architecture\n- Multiboot2 Specification\n- 5 GDT Segments\n- 256 IDT Gates\n- Bitmap Physical Memory Manager\n- Framebuffer 1536x1024 32bpp',
  },
  '/home/Documents/phase1_complete.log': {
    type: 'file',
    size: 180,
    modified: '2026-10-02T10:00:00Z',
    content: '[BOOT] Multiboot2 Header Verified: 0xE85250D6\n[INIT] PMM: 256 MB RAM\n[STATUS] Phase 1: Boot & Core Kernel COMPLETE',
  },
  '/home/Downloads/nsk-os-0.3.iso': {
    type: 'file',
    size: 8388608,
    modified: '2026-10-02T10:00:00Z',
    content: 'NSK-OS-BOOTABLE-ISO',
  },
  '/home/Notes/release_notes.txt': {
    type: 'file',
    size: 140,
    modified: '2026-10-02T10:00:00Z',
    content: 'NSK OS v0.3 Release Notes:\n- Clean bootable desktop without startup popups\n- Fully movable and resizable windows\n- Floating Dock with live indicators',
  },
};

export const FileManager: React.FC<FileManagerProps> = ({
  initialPath = '/home',
  onOpenFile,
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [fsData, setFsData] = useState<Record<string, { type: 'folder' | 'file'; size: number; modified: string; content?: string }>>(() => {
    try {
      const stored = localStorage.getItem('nsk_fs_data');
      return stored ? JSON.parse(stored) : DEFAULT_FS;
    } catch {
      return DEFAULT_FS;
    }
  });

  const saveFsData = (newData: typeof DEFAULT_FS) => {
    setFsData(newData);
    try {
      localStorage.setItem('nsk_fs_data', JSON.stringify(newData));
    } catch {
      // pass
    }
  };

  // History for navigation
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection & UI state
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Compute items in current directory
  const currentItems: FileItem[] = useMemo(() => {
    const cleanDir = currentPath.replace(/\/+$/, '') || '/home';
    const result: FileItem[] = [];

    for (const [pathKey, val] of Object.entries(fsData)) {
      if (pathKey === cleanDir) continue;
      const lastSlash = pathKey.lastIndexOf('/');
      const parent = pathKey.substring(0, lastSlash) || '/';

      if (parent === cleanDir) {
        const name = pathKey.substring(lastSlash + 1);
        const ext = val.type === 'file' ? (name.split('.').pop() || '') : '';
        result.push({
          name,
          path: pathKey,
          type: val.type,
          size: val.size,
          extension: ext.toLowerCase(),
          modified: val.modified,
        });
      }
    }

    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [fsData, currentPath]);

  // Navigate
  const navigateTo = (newPath: string) => {
    if (newPath === currentPath) return;
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newPath);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    setCurrentPath(newPath);
    setSelectedItem(null);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setCurrentPath(history[prev]);
      setSelectedItem(null);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setCurrentPath(history[next]);
      setSelectedItem(null);
    }
  };

  // Actions
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newPath = `${currentPath.replace(/\/+$/, '')}/${newFolderName.trim()}`;
    const updated = {
      ...fsData,
      [newPath]: { type: 'folder' as const, size: 0, modified: new Date().toISOString() },
    };
    saveFsData(updated);
    setShowNewFolderModal(false);
    setNewFolderName('');
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const newPath = `${currentPath.replace(/\/+$/, '')}/${newFileName.trim()}`;
    const updated = {
      ...fsData,
      [newPath]: { type: 'file' as const, size: 0, modified: new Date().toISOString(), content: '' },
    };
    saveFsData(updated);
    setShowNewFileModal(false);
    setNewFileName('');
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !renameValue.trim()) return;
    const lastSlash = selectedItem.path.lastIndexOf('/');
    const parent = selectedItem.path.substring(0, lastSlash);
    const newPath = `${parent}/${renameValue.trim()}`;

    const updated = { ...fsData };
    if (updated[selectedItem.path]) {
      updated[newPath] = updated[selectedItem.path];
      delete updated[selectedItem.path];
      saveFsData(updated);
    }
    setShowRenameModal(false);
    setSelectedItem(null);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    const updated = { ...fsData };
    delete updated[selectedItem.path];
    saveFsData(updated);
    setShowDeleteConfirm(false);
    setSelectedItem(null);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper for file type icons
  const renderFileIcon = (item: FileItem) => {
    const ext = item.extension.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return (
        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
          <ImageIcon className="w-6 h-6 stroke-[1.8]" />
        </div>
      );
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return (
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
          <Music className="w-6 h-6 stroke-[1.8]" />
        </div>
      );
    }
    if (['mp4', 'mkv', 'webm'].includes(ext)) {
      return (
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
          <Video className="w-6 h-6 stroke-[1.8]" />
        </div>
      );
    }
    if (['c', 'h', 'asm', 'ts', 'js', 'json', 'py', 'sh'].includes(ext)) {
      return (
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
          <Code className="w-6 h-6 stroke-[1.8]" />
        </div>
      );
    }
    if (['txt', 'md', 'log'].includes(ext)) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
          <FileText className="w-6 h-6 stroke-[1.8]" />
        </div>
      );
    }
    return (
      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
        <File className="w-6 h-6 stroke-[1.8]" />
      </div>
    );
  };

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentItems;
    return currentItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [currentItems, searchQuery]);

  // Sidebar Shortcuts (all factory folders use the authentic file.jpeg artwork)
  const sidebarShortcuts = [
    { name: 'Home', path: '/home' },
    { name: 'Desktop', path: '/home/Desktop' },
    { name: 'Documents', path: '/home/Documents' },
    { name: 'Downloads', path: '/home/Downloads' },
    { name: 'Pictures', path: '/home/Pictures' },
    { name: 'Music', path: '/home/Music' },
    { name: 'Videos', path: '/home/Videos' },
    { name: 'Notes', path: '/home/Notes' },
    { name: 'Applications', path: '/home/Applications' },
    { name: 'Projects', path: '/home/Projects' },
    { name: 'Trash', path: '/home/Trash' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 text-slate-800 text-xs overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-md shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={historyIndex === 0}
            title="Back"
            className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            title="Forward"
            className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Address / Path Bar */}
        <div className="flex-1 max-w-[320px] h-7 bg-white/90 border border-slate-200 rounded-lg px-2.5 flex items-center gap-1.5 text-xs text-slate-700 shadow-2xs font-mono overflow-x-auto whitespace-nowrap">
          <img src={folderArtwork} alt="Path Root" className="w-3.5 h-3.5 object-contain" />
          <span className="font-sans font-medium text-slate-700">{currentPath}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 border-l border-r border-slate-200/80 px-2">
          <button
            onClick={() => {
              setNewFolderName('');
              setShowNewFolderModal(true);
            }}
            title="New Folder"
            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">New Folder</span>
          </button>

          <button
            onClick={() => {
              setNewFileName('');
              setShowNewFileModal(true);
            }}
            title="New File"
            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">New File</span>
          </button>

          {selectedItem && (
            <>
              <button
                onClick={() => {
                  setRenameValue(selectedItem.name);
                  setShowRenameModal(true);
                }}
                title="Rename Item"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Item"
                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              const stored = localStorage.getItem('nsk_fs_data');
              if (stored) setFsData(JSON.parse(stored));
            }}
            title="Refresh"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search & View Mode */}
        <div className="flex items-center gap-2">
          <div className="w-36 lg:w-44 h-7 bg-white/90 border border-slate-200 rounded-lg px-2 flex items-center gap-1.5 text-xs text-slate-500 shadow-2xs">
            <Search className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace (Sidebar + Explorer) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Standard Factory Folders using real file.jpeg icon */}
        <div className="w-44 border-r border-slate-200/80 bg-white/40 p-2 space-y-0.5 overflow-y-auto shrink-0">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Favorites
          </div>
          {sidebarShortcuts.map((item) => {
            const isSelected = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigateTo(item.path)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {/* Authentic scaled file.jpeg folder artwork */}
                <img
                  src={folderArtwork}
                  alt="Folder"
                  className="w-4 h-4 object-contain shrink-0"
                />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div
          onClick={() => setSelectedItem(null)}
          className="flex-1 p-4 overflow-y-auto relative bg-white/30"
        >
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <img src={folderArtwork} alt="Empty Folder" className="w-14 h-14 object-contain opacity-40 mb-2" />
              <p className="text-sm font-medium">This folder is empty</p>
              <p className="text-xs text-slate-400 mt-1">Use "New Folder" or "New File" above</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.path === item.path;
                return (
                  <div
                    key={item.path}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (item.type === 'folder') {
                        navigateTo(item.path);
                      } else {
                        onOpenFile?.(item);
                      }
                    }}
                    className={`flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-400/50 shadow-xs'
                        : 'border-transparent hover:bg-slate-100/60 hover:border-slate-200/60'
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-2">
                      {item.type === 'folder' ? (
                        <img
                          src={folderArtwork}
                          alt={item.name}
                          draggable={false}
                          className="w-12 h-12 object-contain drop-shadow-2xs select-none hover:scale-105 transition-transform"
                        />
                      ) : (
                        renderFileIcon(item)
                      )}
                    </div>
                    <span
                      title={item.name}
                      className={`text-xs font-medium text-center line-clamp-2 px-1 rounded break-all leading-tight ${
                        isSelected ? 'text-blue-900 font-semibold' : 'text-slate-800'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {item.type === 'folder' ? 'Folder' : formatSize(item.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full bg-white/70 rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3 w-28">Type</th>
                    <th className="py-2 px-3 w-24">Size</th>
                    <th className="py-2 px-3 w-36">Date Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedItem?.path === item.path;
                    return (
                      <tr
                        key={item.path}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (item.type === 'folder') {
                            navigateTo(item.path);
                          } else {
                            onOpenFile?.(item);
                          }
                        }}
                        className={`border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer ${
                          isSelected ? 'bg-blue-500/15' : ''
                        }`}
                      >
                        <td className="py-2 px-3 flex items-center gap-2">
                          {item.type === 'folder' ? (
                            <img src={folderArtwork} alt="Folder" className="w-4 h-4 object-contain" />
                          ) : (
                            <File className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-medium text-slate-800">{item.name}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 uppercase">
                          {item.type === 'folder' ? 'Folder' : item.extension || 'File'}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono">
                          {item.type === 'folder' ? '--' : formatSize(item.size)}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {formatDate(item.modified)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-6 px-3 border-t border-slate-200/80 bg-white/60 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span>{filteredItems.length} items</span>
        {selectedItem ? (
          <span className="truncate max-w-xs font-mono">
            Selected: {selectedItem.name} ({selectedItem.type === 'folder' ? 'Folder' : formatSize(selectedItem.size)})
          </span>
        ) : (
          <span>NSK OS Filesystem</span>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateFolder}
            className="bg-white rounded-xl shadow-2xl border border-white/80 p-5 max-w-sm w-full"
          >
            <h4 className="font-semibold text-slate-800 text-sm mb-3">Create New Folder</h4>
            <input
              type="text"
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateFile}
            className="bg-white rounded-xl shadow-2xl border border-white/80 p-5 max-w-sm w-full"
          >
            <h4 className="font-semibold text-slate-800 text-sm mb-3">Create New File</h4>
            <input
              type="text"
              autoFocus
              placeholder="Filename (e.g. notes.txt)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && selectedItem && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleRename}
            className="bg-white rounded-xl shadow-2xl border border-white/80 p-5 max-w-sm w-full"
          >
            <h4 className="font-semibold text-slate-800 text-sm mb-3">Rename "{selectedItem.name}"</h4>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedItem && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-white/80 p-5 max-w-sm w-full">
            <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2 text-rose-600">
              <Trash2 className="w-4 h-4" />
              Delete {selectedItem.type}?
            </h4>
            <p className="text-slate-600 text-xs mb-4">
              Are you sure you want to delete <strong className="text-slate-800">{selectedItem.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
