import React, { useState, useEffect, useRef } from 'react';
import wallpaperImg from './assets/images/wallpaper_nsk_1790838490517.jpg';
import { TopBar } from './components/TopBar';
import { DesktopIcons } from './components/DesktopIcons';
import { Widget } from './components/Widget';
import { FileManager } from './components/FileManager';
import { Terminal } from './components/Terminal';
import { Dock } from './components/Dock';
import { AppWindow } from './components/AppWindow';
import { SerialMonitor } from './components/SerialMonitor';
import { SourceViewer } from './components/SourceViewer';
import { Phase1Verification } from './components/Phase1Verification';
import { X, Info, Settings as SettingsIcon, Image as ImageIcon, Music as MusicIcon } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'desktop' | 'serial' | 'source' | 'verification'>('desktop');
  const [currentTimeString, setCurrentTimeString] = useState('');
  const [timeOnlyString, setTimeOnlyString] = useState('20:45');
  const [dateOnlyString, setDateOnlyString] = useState('Tue, 30 Sep 2026');

  // Resource statistics for the widget
  const [cpuUsage, setCpuUsage] = useState(6);
  const [ramUsage, setRamUsage] = useState(85);
  const [diskUsage] = useState(12);

  // Window states
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({
    files: false,
    terminal: false,
    photos: false,
    music: false,
    settings: false,
    browserNotice: false
  });

  // Running state is separate from visibility so minimizing keeps the app alive in the Dock.
  const [runningApps, setRunningApps] = useState<Record<string, boolean>>({
    files: false, terminal: false, photos: false, music: false, settings: false
  });

  const [activeWindow, setActiveWindow] = useState<'files' | 'terminal' | 'settings' | 'photos' | 'music'>('files');
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
      const windowHeight = window.innerHeight - 32; // minus topbar
      const targetWidth = 1536;
      const targetHeight = 1024 - 32; // 988

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
    const updateClock = () => {
      const now = new Date();
      const date = now.toLocaleDateString('en-US', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
      const time = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
      setCurrentTimeString(`${date}   ${time}`);
      setDateOnlyString(date);
      setTimeOnlyString(time);
    };
    updateClock();
    const clock = setInterval(updateClock, 1000);
    return () => clearInterval(clock);
  }, []);

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
      setRunningApps(prev => ({ ...prev, files: true }));
      bringToFront('files');
    } else if (appId === 'terminal') {
      setOpenApps(prev => ({ ...prev, terminal: true }));
      setRunningApps(prev => ({ ...prev, terminal: true }));
      bringToFront('terminal');
    } else if (appId === 'browser') {
      setOpenApps(prev => ({ ...prev, browserNotice: true }));
    } else if (appId === 'settings') {
      setOpenApps(prev => ({ ...prev, settings: true }));
      setRunningApps(prev => ({ ...prev, settings: true }));
      bringToFront('settings');
    } else if (appId === 'photos') {
      setOpenApps(prev => ({ ...prev, photos: true }));
      setRunningApps(prev => ({ ...prev, photos: true }));
      bringToFront('photos');
    } else if (appId === 'music') {
      setOpenApps(prev => ({ ...prev, music: true }));
      setRunningApps(prev => ({ ...prev, music: true }));
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
        activeApp={activeWindow === 'files' ? 'File Manager' : activeWindow === 'terminal' ? 'NSK Terminal' : activeWindow === 'settings' ? 'Settings' : activeWindow === 'photos' ? 'Photos' : activeWindow === 'music' ? 'Music' : 'Desktop'}
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
              height: '992px', // 1024 - 36px topbar
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
                setRunningApps(prev => ({ ...prev, files: true }));
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
              onClose={() => {
                setOpenApps(prev => ({ ...prev, files: false }));
                setRunningApps(prev => ({ ...prev, files: false }));
              }}
              onMinimize={() => setOpenApps(prev => ({ ...prev, files: false }))}
              zIndex={zIndexes.files}
              onFocus={() => bringToFront('files')}
            />

            {/* Terminal Window (x856-1491, y461-853) */}
            <Terminal
              isOpen={openApps.terminal}
              onClose={() => {
                setOpenApps(prev => ({ ...prev, terminal: false }));
                setRunningApps(prev => ({ ...prev, terminal: false }));
              }}
              onMinimize={() => setOpenApps(prev => ({ ...prev, terminal: false }))}
              zIndex={zIndexes.terminal}
              onFocus={() => bringToFront('terminal')}
            />

            {openApps.settings && (
              <AppWindow title="Settings" isOpen={true} onClose={()=>{setOpenApps(p=>({...p,settings:false}));setRunningApps(p=>({...p,settings:false}))}} onMinimize={()=>setOpenApps(p=>({...p,settings:false}))} zIndex={zIndexes.settings} onFocus={()=>bringToFront('settings')} initial={{x:420,y:200,w:560,h:430}}>
                <div className="h-full overflow-auto p-5 text-xs text-slate-600">
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100"><div className="font-semibold text-blue-900 text-sm mb-1">NSK OS v0.3 (Protected Mode)</div><p>Built completely from scratch with custom 32-bit x86 kernel, Multiboot2, and PMM.</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-lg"><span className="text-slate-400 block text-[11px]">Architecture</span><span className="font-semibold text-slate-800">x86 (i686 Protected Mode)</span></div>
                      <div className="p-2.5 bg-slate-50 rounded-lg"><span className="text-slate-400 block text-[11px]">Resolution</span><span className="font-semibold text-slate-800">1536 x 1024 @ 32bpp</span></div>
                      <div className="p-2.5 bg-slate-50 rounded-lg"><span className="text-slate-400 block text-[11px]">Current Phase</span><span className="font-semibold text-emerald-600">Phase 1: Boot & Core Kernel [Complete]</span></div>
                      <div className="p-2.5 bg-slate-50 rounded-lg"><span className="text-slate-400 block text-[11px]">Target ISO Size</span><span className="font-semibold text-slate-800">&lt; 20 MB (~8.2 MB)</span></div>
                    </div>
                  </div>
                </div>
              </AppWindow>
            )}
            {openApps.photos && (
              <AppWindow title="Photos" isOpen={true} onClose={()=>{setOpenApps(p=>({...p,photos:false}));setRunningApps(p=>({...p,photos:false}))}} onMinimize={()=>setOpenApps(p=>({...p,photos:false}))} zIndex={zIndexes.photos} onFocus={()=>bringToFront('photos')} initial={{x:520,y:250,w:500,h:360}}>
                <div className="h-full p-5 overflow-auto"><div className="rounded-lg overflow-hidden border border-slate-200"><img src={wallpaperImg} alt="Preview" className="w-full h-56 object-cover" /></div><span className="text-xs text-slate-500 font-medium block mt-2">HOME.PNG - Bloom wallpaper (kernel/wallpaper_home.h)</span></div>
              </AppWindow>
            )}
            {openApps.music && (
              <AppWindow title="Music" isOpen={true} onClose={()=>{setOpenApps(p=>({...p,music:false}));setRunningApps(p=>({...p,music:false}))}} onMinimize={()=>setOpenApps(p=>({...p,music:false}))} zIndex={zIndexes.music} onFocus={()=>bringToFront('music')} initial={{x:600,y:300,w:380,h:300}}>
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-600"><div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2"><MusicIcon className="w-6 h-6"/></div><div className="font-semibold text-slate-800">ambient_soundtrack.mp3</div><div className="text-slate-400 text-[11px] mt-1">Audio subsystem scheduled for Phase 6</div></div>
              </AppWindow>
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
            <Dock onOpenApp={handleOpenApp} openApps={runningApps} />
          </div>
        </div>
      )}
    </div>
  );
}
