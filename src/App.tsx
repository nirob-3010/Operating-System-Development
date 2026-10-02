import React, { useState, useEffect, useRef } from 'react';
import wallpaperDefault from './assets/images/wallpaper_nsk_1790838490517.jpg';
import wallpaperBloom from './assets/images/bloom_wallpaper_1790887210492.jpg';
import { TopBar } from './components/TopBar';
import { DesktopIcons } from './components/DesktopIcons';
import { Widget } from './components/Widget';
import { WindowFrame } from './components/WindowFrame';
import { FileManager, FileItem } from './components/FileManager';
import { Terminal } from './components/Terminal';
import { Dock } from './components/Dock';
import { SerialMonitor } from './components/SerialMonitor';
import { SourceViewer } from './components/SourceViewer';
import { Phase1Verification } from './components/Phase1Verification';
import { AppId, WindowState } from './types/os';

// Dock icons for WindowFrame headers
import filesIcon from './assets/dock-icons/files.png';
import browserIcon from './assets/dock-icons/browser.png';
import photosIcon from './assets/dock-icons/photos.png';
import calendarIcon from './assets/dock-icons/calendar.png';
import notesIcon from './assets/dock-icons/notes.png';
import clockIcon from './assets/dock-icons/clock.png';
import calculatorIcon from './assets/dock-icons/calculator.png';
import settingsIcon from './assets/dock-icons/settings.png';
import {
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Info,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Calculator as CalculatorIcon,
  FileText,
  Check,
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'desktop' | 'serial' | 'source' | 'verification'>('desktop');
  const [wallpaper, setWallpaper] = useState<string>(() => {
    return localStorage.getItem('nsk_wallpaper') || wallpaperDefault;
  });

  const handleSetWallpaper = (src: string) => {
    setWallpaper(src);
    localStorage.setItem('nsk_wallpaper', src);
  };

  // Hardware resource statistics
  const [cpuUsage, setCpuUsage] = useState(6);
  const [ramUsage, setRamUsage] = useState(85);
  const [diskUsage] = useState(12);
  const [widgetVisible, setWidgetVisible] = useState(true);

  // Fluctuations for realism
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.min(18, Math.max(4, prev + delta));
      });
      setRamUsage(prev => {
        const delta = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.min(86, Math.max(84, prev + delta));
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Startup configuration (default: NO apps open on startup, as required by user)
  const [startupApps, setStartupApps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('nsk_startup_apps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleStartupApp = (appId: string) => {
    setStartupApps(prev => {
      const updated = { ...prev, [appId]: !prev[appId] };
      localStorage.setItem('nsk_startup_apps', JSON.stringify(updated));
      return updated;
    });
  };

  // Unified Windows Dictionary
  const [windows, setWindows] = useState<Record<AppId, WindowState>>(() => {
    const baseWindows: Record<AppId, WindowState> = {
      files: {
        id: 'files',
        title: 'File Manager',
        isOpen: false, // Clean desktop on startup
        isMinimized: false,
        isMaximized: false,
        position: { x: 100, y: 40 },
        size: { width: 780, height: 490 },
        zIndex: 10,
        data: { path: '/home' },
      },
      terminal: {
        id: 'terminal',
        title: 'NSK Terminal',
        isOpen: false, // Clean desktop on startup
        isMinimized: false,
        isMaximized: false,
        position: { x: 220, y: 90 },
        size: { width: 700, height: 440 },
        zIndex: 10,
      },
      browser: {
        id: 'browser',
        title: 'Browser',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 150, y: 50 },
        size: { width: 620, height: 400 },
        zIndex: 10,
      },
      photos: {
        id: 'photos',
        title: 'Photos',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 200, y: 60 },
        size: { width: 640, height: 460 },
        zIndex: 10,
      },
      notes: {
        id: 'notes',
        title: 'Notes',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 180, y: 70 },
        size: { width: 600, height: 440 },
        zIndex: 10,
      },
      calendar: {
        id: 'calendar',
        title: 'Calendar',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 280, y: 80 },
        size: { width: 440, height: 380 },
        zIndex: 10,
      },
      clock: {
        id: 'clock',
        title: 'Clock',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 320, y: 90 },
        size: { width: 420, height: 380 },
        zIndex: 10,
      },
      calculator: {
        id: 'calculator',
        title: 'Calculator',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 380, y: 100 },
        size: { width: 300, height: 440 },
        zIndex: 10,
      },
      settings: {
        id: 'settings',
        title: 'Settings',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 210, y: 70 },
        size: { width: 640, height: 460 },
        zIndex: 10,
      },
    };

    try {
      const savedStartup = localStorage.getItem('nsk_startup_apps');
      if (savedStartup) {
        const config = JSON.parse(savedStartup);
        for (const [id, enabled] of Object.entries(config)) {
          if (enabled && baseWindows[id as AppId]) {
            baseWindows[id as AppId].isOpen = true;
          }
        }
      }
    } catch {
      // pass
    }

    return baseWindows;
  });

  const [activeWindowId, setActiveWindowId] = useState<AppId | null>(null);
  const maxZIndexRef = useRef(30);

  // Bring window to front
  const bringToFront = (appId: AppId) => {
    setActiveWindowId(appId);
    maxZIndexRef.current += 1;
    const newZ = maxZIndexRef.current;
    setWindows(prev => {
      const win = prev[appId];
      if (!win) return prev;
      return {
        ...prev,
        [appId]: {
          ...win,
          zIndex: newZ,
          isMinimized: false,
        },
      };
    });
  };

  // Launch or Open an App
  const openApp = (appId: AppId | string, data?: any) => {
    if (appId === 'trash') {
      openApp('files', { path: '/home/Trash' });
      return;
    }

    const targetId = appId as AppId;
    if (!windows[targetId]) return;

    maxZIndexRef.current += 1;
    const newZ = maxZIndexRef.current;

    setWindows(prev => {
      const current = prev[targetId];
      return {
        ...prev,
        [targetId]: {
          ...current,
          isOpen: true,
          isMinimized: false,
          zIndex: newZ,
          data: data !== undefined ? data : current.data,
        },
      };
    });
    setActiveWindowId(targetId);
  };

  // Close window
  const closeWindow = (appId: AppId) => {
    setWindows(prev => {
      const current = prev[appId];
      if (!current) return prev;
      return {
        ...prev,
        [appId]: {
          ...current,
          isOpen: false,
          isMinimized: false,
        },
      };
    });
    if (activeWindowId === appId) {
      const remainingOpen = Object.values(windows).filter(
        w => w.id !== appId && w.isOpen && !w.isMinimized
      );
      if (remainingOpen.length > 0) {
        remainingOpen.sort((a, b) => b.zIndex - a.zIndex);
        setActiveWindowId(remainingOpen[0].id);
      } else {
        setActiveWindowId(null);
      }
    }
  };

  // Minimize window
  const minimizeWindow = (appId: AppId) => {
    setWindows(prev => {
      const current = prev[appId];
      if (!current) return prev;
      return {
        ...prev,
        [appId]: {
          ...current,
          isMinimized: true,
        },
      };
    });
    if (activeWindowId === appId) {
      const remainingOpen = Object.values(windows).filter(
        w => w.id !== appId && w.isOpen && !w.isMinimized
      );
      if (remainingOpen.length > 0) {
        remainingOpen.sort((a, b) => b.zIndex - a.zIndex);
        setActiveWindowId(remainingOpen[0].id);
      } else {
        setActiveWindowId(null);
      }
    }
  };

  // Toggle Maximize / Restore
  const toggleMaximize = (appId: AppId) => {
    bringToFront(appId);
    setWindows(prev => {
      const current = prev[appId];
      if (!current) return prev;

      if (current.isMaximized) {
        return {
          ...prev,
          [appId]: {
            ...current,
            isMaximized: false,
            position: current.prevPosition || current.position,
            size: current.prevSize || current.size,
          },
        };
      } else {
        return {
          ...prev,
          [appId]: {
            ...current,
            isMaximized: true,
            prevPosition: { ...current.position },
            prevSize: { ...current.size },
          },
        };
      }
    });
  };

  // Update window position (from dragging)
  const updatePosition = (appId: AppId, pos: { x: number; y: number }) => {
    setWindows(prev => {
      const current = prev[appId];
      if (!current) return prev;
      return {
        ...prev,
        [appId]: {
          ...current,
          position: pos,
        },
      };
    });
  };

  // Update window size & position (from resizing)
  const updateSize = (
    appId: AppId,
    size: { width: number; height: number },
    pos?: { x: number; y: number }
  ) => {
    setWindows(prev => {
      const current = prev[appId];
      if (!current) return prev;
      return {
        ...prev,
        [appId]: {
          ...current,
          size,
          position: pos || current.position,
        },
      };
    });
  };

  // Dock Click Handler:
  // - App closed -> Launch
  // - App running & minimized -> Restore
  // - App visible -> If active, minimize; if inactive, focus!
  const handleDockClick = (appId: string) => {
    if (appId === 'trash') {
      openApp('files', { path: '/home/Trash' });
      return;
    }

    const id = appId as AppId;
    const win = windows[id];
    if (!win) return;

    if (!win.isOpen) {
      openApp(id);
    } else if (win.isMinimized) {
      bringToFront(id);
    } else {
      if (activeWindowId === id) {
        minimizeWindow(id);
      } else {
        bringToFront(id);
      }
    }
  };

  // Handle opening file
  const handleOpenFile = (file: FileItem) => {
    const ext = file.extension.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      openApp('photos');
    } else {
      openApp('notes');
    }
  };

  // Indicators for Dock
  const dockOpenApps: Record<string, boolean> = {};
  const dockMinimizedApps: Record<string, boolean> = {};
  for (const [id, win] of Object.entries(windows)) {
    if (win.isOpen) {
      dockOpenApps[id] = true;
      if (win.isMinimized) {
        dockMinimizedApps[id] = true;
      }
    }
  }

  const activeAppName = activeWindowId ? windows[activeWindowId]?.title : 'Finder';
  const [selectedDesktopIcon, setSelectedDesktopIcon] = useState<string | null>(null);

  const getAppHeaderIcon = (id: AppId) => {
    switch (id) {
      case 'files':
        return <img src={filesIcon} alt="Files" className="w-4 h-4 object-contain" />;
      case 'terminal':
        return <TerminalIcon className="w-4 h-4 text-slate-700" />;
      case 'browser':
        return <img src={browserIcon} alt="Browser" className="w-4 h-4 object-contain" />;
      case 'photos':
        return <img src={photosIcon} alt="Photos" className="w-4 h-4 object-contain" />;
      case 'notes':
        return <img src={notesIcon} alt="Notes" className="w-4 h-4 object-contain" />;
      case 'calendar':
        return <img src={calendarIcon} alt="Calendar" className="w-4 h-4 object-contain" />;
      case 'clock':
        return <img src={clockIcon} alt="Clock" className="w-4 h-4 object-contain" />;
      case 'calculator':
        return <img src={calculatorIcon} alt="Calculator" className="w-4 h-4 object-contain" />;
      case 'settings':
        return <img src={settingsIcon} alt="Settings" className="w-4 h-4 object-contain" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-900 select-none relative font-sans">
      {/* Top Menu Bar (Height: 36px) */}
      <TopBar
        currentView={currentView}
        onViewChange={setCurrentView}
        activeAppName={activeAppName}
        onOpenApp={openApp}
        onCloseActiveWindow={() => activeWindowId && closeWindow(activeWindowId)}
        onNewFolder={() => openApp('files')}
        onNewFile={() => openApp('files')}
        onToggleWidget={() => setWidgetVisible(!widgetVisible)}
        widgetVisible={widgetVisible}
      />

      {/* Alternate Developer Kernel Views (Direct Kernel Inspection) */}
      {currentView === 'serial' && <SerialMonitor />}
      {currentView === 'source' && <SourceViewer />}
      {currentView === 'verification' && <Phase1Verification />}

      {/* Main Desktop GUI View (Responsive Native OS Presentation) */}
      {currentView === 'desktop' && (
        <main
          onClick={() => {
            setSelectedDesktopIcon(null);
          }}
          className="flex-1 w-full h-[calc(100vh-36px)] relative overflow-hidden flex flex-col select-none"
        >
          {/* Wallpaper */}
          <img
            src={wallpaper}
            alt="NSK OS Wallpaper"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
          />

          {/* Desktop Shortcuts Column (Home, Documents, Pictures, Music, Trash) */}
          <DesktopIcons
            onOpenFolder={(folderPath) => {
              openApp('files', { path: folderPath });
            }}
            selectedIcon={selectedDesktopIcon}
            onSelectIcon={setSelectedDesktopIcon}
          />

          {/* Resource & Clock Widget */}
          {widgetVisible && (
            <Widget
              cpuUsage={cpuUsage}
              ramUsage={ramUsage}
              diskUsage={diskUsage}
              timeString={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              dateString={new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              onClose={() => setWidgetVisible(false)}
            />
          )}

          {/* --- APPLICATION WINDOWS (Movable, Resizable, Minimizable) --- */}

          {/* 1. File Manager Window */}
          {windows.files.isOpen && (
            <WindowFrame
              id="files"
              title={windows.files.title}
              isOpen={windows.files.isOpen}
              isMinimized={windows.files.isMinimized}
              isMaximized={windows.files.isMaximized}
              position={windows.files.position}
              size={windows.files.size}
              zIndex={windows.files.zIndex}
              isActive={activeWindowId === 'files'}
              onFocus={() => bringToFront('files')}
              onClose={() => closeWindow('files')}
              onMinimize={() => minimizeWindow('files')}
              onToggleMaximize={() => toggleMaximize('files')}
              onUpdatePosition={(pos) => updatePosition('files', pos)}
              onUpdateSize={(sz, pos) => updateSize('files', sz, pos)}
              icon={getAppHeaderIcon('files')}
              minWidth={520}
              minHeight={340}
            >
              <FileManager
                initialPath={windows.files.data?.path || '/home'}
                onOpenFile={handleOpenFile}
              />
            </WindowFrame>
          )}

          {/* 2. NSK Terminal Window */}
          {windows.terminal.isOpen && (
            <WindowFrame
              id="terminal"
              title={windows.terminal.title}
              isOpen={windows.terminal.isOpen}
              isMinimized={windows.terminal.isMinimized}
              isMaximized={windows.terminal.isMaximized}
              position={windows.terminal.position}
              size={windows.terminal.size}
              zIndex={windows.terminal.zIndex}
              isActive={activeWindowId === 'terminal'}
              onFocus={() => bringToFront('terminal')}
              onClose={() => closeWindow('terminal')}
              onMinimize={() => minimizeWindow('terminal')}
              onToggleMaximize={() => toggleMaximize('terminal')}
              onUpdatePosition={(pos) => updatePosition('terminal', pos)}
              onUpdateSize={(sz, pos) => updateSize('terminal', sz, pos)}
              icon={getAppHeaderIcon('terminal')}
              minWidth={480}
              minHeight={300}
            >
              <Terminal initialCwd="/home" />
            </WindowFrame>
          )}

          {/* 3. Settings Window */}
          {windows.settings.isOpen && (
            <WindowFrame
              id="settings"
              title="System Settings & Architecture"
              isOpen={windows.settings.isOpen}
              isMinimized={windows.settings.isMinimized}
              isMaximized={windows.settings.isMaximized}
              position={windows.settings.position}
              size={windows.settings.size}
              zIndex={windows.settings.zIndex}
              isActive={activeWindowId === 'settings'}
              onFocus={() => bringToFront('settings')}
              onClose={() => closeWindow('settings')}
              onMinimize={() => minimizeWindow('settings')}
              onToggleMaximize={() => toggleMaximize('settings')}
              onUpdatePosition={(pos) => updatePosition('settings', pos)}
              onUpdateSize={(sz, pos) => updateSize('settings', sz, pos)}
              icon={getAppHeaderIcon('settings')}
              minWidth={520}
              minHeight={380}
            >
              <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700 bg-white/80 h-full">
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <SettingsIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800 text-sm">NSK OS v0.3 (Protected Mode)</span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    Built completely from scratch with custom 32-bit x86 kernel, Multiboot2 specification, and PMM.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Architecture</span>
                    <span className="font-semibold text-slate-800">x86 (i686 Protected Mode)</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Resolution</span>
                    <span className="font-semibold text-slate-800">1536 x 1024 @ 32bpp</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Current Phase</span>
                    <span className="font-semibold text-emerald-600">Phase 1 &amp; Phase 3 Active</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Target ISO Size</span>
                    <span className="font-semibold text-slate-800">&lt; 20 MB (~8.2 MB)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="font-semibold text-slate-800 mb-2">Select Wallpaper</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => handleSetWallpaper(wallpaperDefault)}
                      className={`cursor-pointer rounded-xl overflow-hidden border-2 p-1 ${
                        wallpaper === wallpaperDefault ? 'border-blue-600 ring-2 ring-blue-600/30' : 'border-slate-200'
                      }`}
                    >
                      <img src={wallpaperDefault} alt="NSK Blue Wave" className="w-full h-24 object-cover rounded-lg" />
                      <div className="mt-1 text-center font-medium text-[11px] text-slate-700">NSK Blue Wave</div>
                    </div>
                    <div
                      onClick={() => handleSetWallpaper(wallpaperBloom)}
                      className={`cursor-pointer rounded-xl overflow-hidden border-2 p-1 ${
                        wallpaper === wallpaperBloom ? 'border-blue-600 ring-2 ring-blue-600/30' : 'border-slate-200'
                      }`}
                    >
                      <img src={wallpaperBloom} alt="Bloom Silk" className="w-full h-24 object-cover rounded-lg" />
                      <div className="mt-1 text-center font-medium text-[11px] text-slate-700">Bloom Silk Theme</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="font-semibold text-slate-800 mb-1">Startup Applications</div>
                  <p className="text-[11px] text-slate-500 mb-2">Configure applications that launch automatically on OS startup.</p>
                  <div className="space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {[
                      { id: 'files', name: 'File Manager' },
                      { id: 'terminal', name: 'NSK Terminal' },
                    ].map(app => (
                      <div key={app.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                        <span className="font-medium text-slate-700">{app.name}</span>
                        <button
                          onClick={() => handleToggleStartupApp(app.id)}
                          className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            startupApps[app.id] ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {startupApps[app.id] ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </WindowFrame>
          )}

          {/* 4. Photos Window */}
          {windows.photos.isOpen && (
            <WindowFrame
              id="photos"
              title="NSK Photos Viewer"
              isOpen={windows.photos.isOpen}
              isMinimized={windows.photos.isMinimized}
              isMaximized={windows.photos.isMaximized}
              position={windows.photos.position}
              size={windows.photos.size}
              zIndex={windows.photos.zIndex}
              isActive={activeWindowId === 'photos'}
              onFocus={() => bringToFront('photos')}
              onClose={() => closeWindow('photos')}
              onMinimize={() => minimizeWindow('photos')}
              onToggleMaximize={() => toggleMaximize('photos')}
              onUpdatePosition={(pos) => updatePosition('photos', pos)}
              onUpdateSize={(sz, pos) => updateSize('photos', sz, pos)}
              icon={getAppHeaderIcon('photos')}
              minWidth={460}
              minHeight={340}
            >
              <div className="p-4 flex flex-col h-full bg-slate-900 text-white">
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <img src={wallpaper} alt="Preview" className="max-h-full object-contain rounded-lg shadow-xl" />
                </div>
                <div className="mt-2 text-center text-xs text-slate-400">
                  HOME.PNG - Desktop Wallpaper (kernel/wallpaper_home.h)
                </div>
              </div>
            </WindowFrame>
          )}

          {/* 5. Browser Notice Modal Window */}
          {windows.browser.isOpen && (
            <WindowFrame
              id="browser"
              title="NSK Browser"
              isOpen={windows.browser.isOpen}
              isMinimized={windows.browser.isMinimized}
              isMaximized={windows.browser.isMaximized}
              position={windows.browser.position}
              size={windows.browser.size}
              zIndex={windows.browser.zIndex}
              isActive={activeWindowId === 'browser'}
              onFocus={() => bringToFront('browser')}
              onClose={() => closeWindow('browser')}
              onMinimize={() => minimizeWindow('browser')}
              onToggleMaximize={() => toggleMaximize('browser')}
              onUpdatePosition={(pos) => updatePosition('browser', pos)}
              onUpdateSize={(sz, pos) => updateSize('browser', sz, pos)}
              icon={getAppHeaderIcon('browser')}
              minWidth={480}
              minHeight={300}
            >
              <div className="p-6 flex flex-col items-center justify-center text-center h-full bg-white text-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  NSK Browser is not available yet
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-md mb-4">
                  A web browser is out of scope for a from-scratch bare-metal operating system kernel without a POSIX networking stack. NSK OS targets QEMU and VirtualBox with native desktop apps.
                </p>
                <button
                  onClick={() => closeWindow('browser')}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                >
                  OK
                </button>
              </div>
            </WindowFrame>
          )}

          {/* 6. Notes Window */}
          {windows.notes.isOpen && (
            <WindowFrame
              id="notes"
              title="NSK Notes"
              isOpen={windows.notes.isOpen}
              isMinimized={windows.notes.isMinimized}
              isMaximized={windows.notes.isMaximized}
              position={windows.notes.position}
              size={windows.notes.size}
              zIndex={windows.notes.zIndex}
              isActive={activeWindowId === 'notes'}
              onFocus={() => bringToFront('notes')}
              onClose={() => closeWindow('notes')}
              onMinimize={() => minimizeWindow('notes')}
              onToggleMaximize={() => toggleMaximize('notes')}
              onUpdatePosition={(pos) => updatePosition('notes', pos)}
              onUpdateSize={(sz, pos) => updateSize('notes', sz, pos)}
              icon={getAppHeaderIcon('notes')}
              minWidth={440}
              minHeight={320}
            >
              <div className="p-4 flex flex-col h-full bg-amber-50/30 text-slate-800">
                <textarea
                  defaultValue={`NSK OS Notes:\n- Custom 32-bit x86 Protected Mode Kernel\n- Multiboot2 Specification\n- Physical Memory Manager (Bitmap)\n- High-Contrast Desktop and Floating Dock`}
                  className="w-full flex-1 p-2 font-mono text-xs bg-white rounded-lg border border-amber-200 outline-none resize-none"
                />
              </div>
            </WindowFrame>
          )}

          {/* 7. Calendar Window */}
          {windows.calendar.isOpen && (
            <WindowFrame
              id="calendar"
              title="NSK Calendar"
              isOpen={windows.calendar.isOpen}
              isMinimized={windows.calendar.isMinimized}
              isMaximized={windows.calendar.isMaximized}
              position={windows.calendar.position}
              size={windows.calendar.size}
              zIndex={windows.calendar.zIndex}
              isActive={activeWindowId === 'calendar'}
              onFocus={() => bringToFront('calendar')}
              onClose={() => closeWindow('calendar')}
              onMinimize={() => minimizeWindow('calendar')}
              onToggleMaximize={() => toggleMaximize('calendar')}
              onUpdatePosition={(pos) => updatePosition('calendar', pos)}
              onUpdateSize={(sz, pos) => updateSize('calendar', sz, pos)}
              icon={getAppHeaderIcon('calendar')}
              minWidth={400}
              minHeight={340}
            >
              <div className="p-5 flex flex-col items-center justify-center h-full bg-white text-slate-800">
                <CalendarIcon className="w-10 h-10 text-blue-600 mb-2" />
                <h3 className="text-base font-bold">{new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
                <p className="text-xs text-slate-500 mt-1">RTC Hardware Synchronized</p>
              </div>
            </WindowFrame>
          )}

          {/* 8. Clock Window */}
          {windows.clock.isOpen && (
            <WindowFrame
              id="clock"
              title="NSK Clock"
              isOpen={windows.clock.isOpen}
              isMinimized={windows.clock.isMinimized}
              isMaximized={windows.clock.isMaximized}
              position={windows.clock.position}
              size={windows.clock.size}
              zIndex={windows.clock.zIndex}
              isActive={activeWindowId === 'clock'}
              onFocus={() => bringToFront('clock')}
              onClose={() => closeWindow('clock')}
              onMinimize={() => minimizeWindow('clock')}
              onToggleMaximize={() => toggleMaximize('clock')}
              onUpdatePosition={(pos) => updatePosition('clock', pos)}
              onUpdateSize={(sz, pos) => updateSize('clock', sz, pos)}
              icon={getAppHeaderIcon('clock')}
              minWidth={380}
              minHeight={320}
            >
              <div className="p-5 flex flex-col items-center justify-center h-full bg-white text-slate-800">
                <ClockIcon className="w-10 h-10 text-indigo-600 mb-2" />
                <div className="text-3xl font-light font-mono text-slate-900">
                  {new Date().toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">Motherboard CMOS RTC (0x70/0x71)</div>
              </div>
            </WindowFrame>
          )}

          {/* 9. Calculator Window */}
          {windows.calculator.isOpen && (
            <WindowFrame
              id="calculator"
              title="NSK Calculator"
              isOpen={windows.calculator.isOpen}
              isMinimized={windows.calculator.isMinimized}
              isMaximized={windows.calculator.isMaximized}
              position={windows.calculator.position}
              size={windows.calculator.size}
              zIndex={windows.calculator.zIndex}
              isActive={activeWindowId === 'calculator'}
              onFocus={() => bringToFront('calculator')}
              onClose={() => closeWindow('calculator')}
              onMinimize={() => minimizeWindow('calculator')}
              onToggleMaximize={() => toggleMaximize('calculator')}
              onUpdatePosition={(pos) => updatePosition('calculator', pos)}
              onUpdateSize={(sz, pos) => updateSize('calculator', sz, pos)}
              icon={getAppHeaderIcon('calculator')}
              minWidth={280}
              minHeight={360}
            >
              <div className="p-5 flex flex-col items-center justify-center h-full bg-slate-900 text-white">
                <CalculatorIcon className="w-10 h-10 text-amber-500 mb-2" />
                <h3 className="text-sm font-semibold">Calculator Applet</h3>
                <p className="text-xs text-slate-400 mt-1">Ready for mathematical evaluation</p>
              </div>
            </WindowFrame>
          )}

          {/* Floating Bottom Dock */}
          <Dock
            onDockClick={handleDockClick}
            openApps={dockOpenApps}
            minimizedApps={dockMinimizedApps}
            activeAppId={activeWindowId}
          />
        </main>
      )}
    </div>
  );
}
