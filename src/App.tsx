import React, { useState, useEffect, useRef } from 'react';
import wallpaperImg from './assets/images/wallpaper_nsk_1790838490517.jpg';
import { TopBar } from './components/TopBar';
import { DesktopIcons } from './components/DesktopIcons';
import { Widget } from './components/Widget';
import { FileManager } from './components/FileManager';
import { Terminal } from './components/Terminal';
import { Dock } from './components/Dock';
import { SerialMonitor } from './components/SerialMonitor';
import { SourceViewer } from './components/SourceViewer';
import { Phase1Verification } from './components/Phase1Verification';
import { X, Info, Settings as SettingsIcon, Image as ImageIcon, Music as MusicIcon } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'desktop' | 'serial' | 'source' | 'verification'>('desktop');
  const [currentTimeString, setCurrentTimeString] = useState('Tue, 30 Sep 2026   20:45');
  const [timeOnlyString, setTimeOnlyString] = useState('20:45');
  const [dateOnlyString, setDateOnlyString] = useState('Tue, 30 Sep 2026');

  // Resource statistics for the widget
  const [cpuUsage, setCpuUsage] = useState(6);
  const [ramUsage, setRamUsage] = useState(85);
  const [diskUsage] = useState(12);

  // Window states
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({
    files: true,
    terminal: true,
    photos: false,
    music: false,
    settings: false,
    browserNotice: false
  });

  const [activeWindow, setActiveWindow] = useState<'files' | 'terminal' | 'settings' | 'photos' | 'music'>('terminal');
  const [zIndexes, setZIndexes] = useState({
    files: 20,
    terminal: 25,
    settings: 30,
    photos: 15,
    music: 15
  });

  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // Scaled canvas layout for 1536x1024
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight - 36; // minus topbar
      const targetWidth = 1536;
      const targetHeight = 1024 - 36; // 988

      const scaleX = windowWidth / targetWidth;
      const scaleY = windowHeight / targetHeight;
      const newScale = Math.min(scaleX, scaleY);
      setScale(Math.min(1, Math.max(0.4, newScale)));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update clock and subtle realistic hardware fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      // Subtle fluctuations for CPU
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.min(18, Math.max(4, prev + delta));
      });
      // Subtle fluctuation for RAM
      setRamUsage(prev => {
        const delta = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.min(86, Math.max(84, prev + delta));
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const bringToFront = (app: 'files' | 'terminal' | 'settings' | 'photos' | 'music') => {
    setActiveWindow(app);
    setZIndexes(prev => {
      const maxZ = Math.max(...Object.values(prev));
      return { ...prev, [app]: maxZ + 1 };
    });
  };

  const handleOpenApp = (appId: string) => {
    if (appId === 'files' || appId === 'folder') {
      setOpenApps(prev => ({ ...prev, files: true }));
      bringToFront('files');
    } else if (appId === 'terminal') {
      setOpenApps(prev => ({ ...prev, terminal: true }));
      bringToFront('terminal');
    } else if (appId === 'browser') {
      setOpenApps(prev => ({ ...prev, browserNotice: true }));
    } else if (appId === 'settings') {
      setOpenApps(prev => ({ ...prev, settings: true }));
      bringToFront('settings');
    } else if (appId === 'photos') {
      setOpenApps(prev => ({ ...prev, photos: true }));
      bringToFront('photos');
    } else if (appId === 'music') {
      setOpenApps(prev => ({ ...prev, music: true }));
      bringToFront('music');
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-900 select-none">
      {/* Top Bar (Height: 36px) */}
      <TopBar
        currentView={currentView}
        onViewChange={setCurrentView}
        currentTimeString={currentTimeString}
      />

      {/* Main View Area */}
      {currentView === 'serial' && <SerialMonitor />}
      {currentView === 'source' && <SourceViewer />}
      {currentView === 'verification' && <Phase1Verification />}

      {currentView === 'desktop' && (
        <div
          ref={containerRef}
          onClick={() => setSelectedIcon(null)}
          className="flex-1 w-full relative overflow-hidden flex items-center justify-center bg-slate-900"
        >
          {/* 1536x1024 Fixed Geometry Canvas Scaled to Viewport */}
          <div
            style={{
              width: '1536px',
              height: '988px', // 1024 - 36px topbar
              transform: `scale(${scale})`,
              transformOrigin: 'center center'
            }}
            className="relative overflow-hidden shadow-2xl shrink-0"
          >
            {/* Full-Bleed Wallpaper Background */}
            <img
              src={wallpaperImg}
              alt="NSK OS Wallpaper"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
            />

            {/* Desktop Icons Column (x61, y85..) */}
            <DesktopIcons
              onOpenFolder={() => {
                setOpenApps(prev => ({ ...prev, files: true }));
                bringToFront('files');
              }}
              selectedIcon={selectedIcon}
              onSelectIcon={setSelectedIcon}
            />

            {/* Top Right Widget (x1297-1519, y62-331) */}
            <Widget
              cpuUsage={cpuUsage}
              ramUsage={ramUsage}
              diskUsage={diskUsage}
              timeString={timeOnlyString}
              dateString={dateOnlyString}
            />

            {/* File Manager Window (x155-788, y152-561) */}
            <FileManager
              isOpen={openApps.files}
              onClose={() => setOpenApps(prev => ({ ...prev, files: false }))}
              onMinimize={() => setOpenApps(prev => ({ ...prev, files: false }))}
              zIndex={zIndexes.files}
              onFocus={() => bringToFront('files')}
            />

            {/* Terminal Window (x856-1491, y461-853) */}
            <Terminal
              isOpen={openApps.terminal}
              onClose={() => setOpenApps(prev => ({ ...prev, terminal: false }))}
              onMinimize={() => setOpenApps(prev => ({ ...prev, terminal: false }))}
              zIndex={zIndexes.terminal}
              onFocus={() => bringToFront('terminal')}
            />

            {/* Settings Window */}
            {openApps.settings && (
              <div
                style={{
                  left: '420px',
                  top: '200px',
                  width: '560px',
                  zIndex: zIndexes.settings
                }}
                onClick={() => bringToFront('settings')}
                className="absolute bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl p-5 select-none"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-sm text-slate-800">System Settings & Architecture</span>
                  </div>
                  <button
                    onClick={() => setOpenApps(prev => ({ ...prev, settings: false }))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                    <div className="font-semibold text-blue-900 text-sm mb-1">NSK OS v0.3 (Protected Mode)</div>
                    <p className="text-slate-600">Built completely from scratch with custom 32-bit x86 kernel, Multiboot2, and PMM.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[11px]">Architecture</span>
                      <span className="font-semibold text-slate-800">x86 (i686 Protected Mode)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[11px]">Resolution</span>
                      <span className="font-semibold text-slate-800">1536 x 1024 @ 32bpp</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[11px]">Current Phase</span>
                      <span className="font-semibold text-emerald-600">Phase 1: Boot & Core Kernel [Complete]</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block text-[11px]">Target ISO Size</span>
                      <span className="font-semibold text-slate-800">&lt; 20 MB (~8.2 MB)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Photos Preview Window */}
            {openApps.photos && (
              <div
                style={{
                  left: '520px',
                  top: '250px',
                  width: '500px',
                  zIndex: zIndexes.photos
                }}
                onClick={() => bringToFront('photos')}
                className="absolute bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl p-5 select-none"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-rose-500" />
                    <span className="font-semibold text-sm text-slate-800">NSK Photos Viewer</span>
                  </div>
                  <button
                    onClick={() => setOpenApps(prev => ({ ...prev, photos: false }))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 mb-2">
                  <img src={wallpaperImg} alt="Preview" className="w-full h-48 object-cover" />
                </div>
                <span className="text-xs text-slate-500 font-medium">wallpaper_bloom_wave_1536x1024.png (Phase 2 Asset)</span>
              </div>
            )}

            {/* Music Preview Window */}
            {openApps.music && (
              <div
                style={{
                  left: '600px',
                  top: '300px',
                  width: '380px',
                  zIndex: zIndexes.music
                }}
                onClick={() => bringToFront('music')}
                className="absolute bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl p-5 select-none"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <MusicIcon className="w-5 h-5 text-rose-600" />
                    <span className="font-semibold text-sm text-slate-800">NSK Music Player</span>
                  </div>
                  <button
                    onClick={() => setOpenApps(prev => ({ ...prev, music: false }))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                    <MusicIcon className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-slate-800">ambient_soundtrack.mp3</div>
                  <div className="text-slate-400 text-[11px] mt-1">Audio subsystem scheduled for Phase 6</div>
                </div>
              </div>
            )}

            {/* Browser Unavailable Modal (Specified in prompt rules: "The dock Browser icon only launches an 'NSK Browser is not available yet' dialog") */}
            {openApps.browserNotice && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center z-50">
                <div className="bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-2xl p-6 max-w-md w-full mx-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    NSK Browser is not available yet
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">
                    A web browser is out of scope for a from-scratch bare-metal operating system kernel without a POSIX networking stack. NSK OS targets QEMU and VirtualBox with native desktop apps.
                  </p>
                  <button
                    onClick={() => setOpenApps(prev => ({ ...prev, browserNotice: false }))}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Dock (x402-1134, y920-1003) */}
            <Dock onOpenApp={handleOpenApp} openApps={openApps} />
          </div>
        </div>
      )}
    </div>
  );
}
