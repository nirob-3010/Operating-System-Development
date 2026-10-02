import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Volume2,
  VolumeX,
  Battery,
  Search,
  Bluetooth,
  Monitor,
  Terminal,
  FileCode,
  CheckCircle2,
  Settings,
  RotateCcw,
  Sliders,
  ChevronDown,
} from 'lucide-react';

interface TopBarProps {
  currentView: 'desktop' | 'serial' | 'source' | 'verification';
  onViewChange: (view: 'desktop' | 'serial' | 'source' | 'verification') => void;
  activeAppName: string;
  onOpenApp?: (appId: string) => void;
  onCloseActiveWindow?: () => void;
  onNewFolder?: () => void;
  onNewFile?: () => void;
  onToggleWidget?: () => void;
  widgetVisible?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onViewChange,
  activeAppName,
  onOpenApp,
  onCloseActiveWindow,
  onNewFolder,
  onNewFile,
  onToggleWidget,
  widgetVisible,
}) => {
  // Real-time date and time
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Menus state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(true);
  const [bluetoothOn, setBluetoothOn] = useState(true);
  const [showControlCenter, setShowControlCenter] = useState(false);

  // Close menus on outside click
  const menuBarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setShowControlCenter(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic menu items based on focused application
  const getAppMenuItems = () => {
    switch (activeAppName.toLowerCase()) {
      case 'file manager':
        return [
          {
            label: 'File',
            items: [
              { label: 'New Folder', action: () => onNewFolder?.() },
              { label: 'New File', action: () => onNewFile?.() },
              { label: 'Close Window', action: () => onCloseActiveWindow?.() },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Undo', action: () => {} },
              { label: 'Cut', action: () => {} },
              { label: 'Copy', action: () => {} },
              { label: 'Paste', action: () => {} },
              { label: 'Select All', action: () => {} },
            ],
          },
          {
            label: 'View',
            items: [
              { label: 'As Icons', action: () => {} },
              { label: 'As List', action: () => {} },
              { label: 'Refresh', action: () => {} },
            ],
          },
          {
            label: 'Window',
            items: [
              { label: 'Minimize', action: () => {} },
              { label: 'Zoom', action: () => {} },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'File Manager Help', action: () => {} },
            ],
          },
        ];

      case 'terminal':
        return [
          {
            label: 'Shell',
            items: [
              { label: 'New Session', action: () => {} },
              { label: 'Close Window', action: () => onCloseActiveWindow?.() },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Copy', action: () => {} },
              { label: 'Paste', action: () => {} },
              { label: 'Clear Scrollback', action: () => {} },
            ],
          },
          {
            label: 'View',
            items: [
              { label: 'Bigger Font', action: () => {} },
              { label: 'Smaller Font', action: () => {} },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'Shell Commands Help', action: () => {} },
            ],
          },
        ];

      case 'browser':
        return [
          {
            label: 'File',
            items: [
              { label: 'New Tab', action: () => {} },
              { label: 'Close Window', action: () => onCloseActiveWindow?.() },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Cut', action: () => {} },
              { label: 'Copy', action: () => {} },
              { label: 'Paste', action: () => {} },
            ],
          },
          {
            label: 'View',
            items: [
              { label: 'Reload Page', action: () => {} },
              { label: 'Actual Size', action: () => {} },
            ],
          },
          {
            label: 'History',
            items: [
              { label: 'Home', action: () => {} },
              { label: 'Documentation', action: () => {} },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'Browser Help', action: () => {} },
            ],
          },
        ];

      case 'photos':
        return [
          {
            label: 'File',
            items: [
              { label: 'Close Window', action: () => onCloseActiveWindow?.() },
            ],
          },
          {
            label: 'Image',
            items: [
              { label: 'Rotate Clockwise', action: () => {} },
              { label: 'Set as Desktop Wallpaper', action: () => {} },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'Photos Help', action: () => {} },
            ],
          },
        ];

      default:
        return [
          {
            label: 'File',
            items: [
              { label: 'New Folder', action: () => onNewFolder?.() },
              { label: 'New File', action: () => onNewFile?.() },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Select All', action: () => {} },
            ],
          },
          {
            label: 'View',
            items: [
              { label: 'Toggle Resource Widget', action: () => onToggleWidget?.() },
            ],
          },
          {
            label: 'Window',
            items: [
              { label: 'Bring All to Front', action: () => {} },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'NSK OS Help', action: () => {} },
            ],
          },
        ];
    }
  };

  const appMenus = getAppMenuItems();

  return (
    <header
      ref={menuBarRef}
      className="h-[36px] w-full px-3 flex items-center justify-between bg-white/75 backdrop-blur-xl border-b border-white/60 shadow-2xs z-50 text-slate-800 text-[13px] font-sans font-medium select-none"
    >
      {/* Left side: NSK OS Logo + Focused App Name + Dynamic App Menus */}
      <div className="flex items-center gap-1">
        {/* NSK OS Logo Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'nsk' ? null : 'nsk')}
            className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              openMenu === 'nsk' ? 'bg-black/10' : 'hover:bg-black/5'
            }`}
          >
            {/* Custom NSK logo */}
            <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-xs">
              <div className="w-[8px] h-[8px] rounded-full bg-white/90"></div>
            </div>
            <span className="font-bold text-[14px] text-slate-900 tracking-tight">NSK OS</span>
          </button>

          {/* NSK OS System Menu Dropdown */}
          {openMenu === 'nsk' && (
            <div className="absolute top-8 left-0 w-52 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl py-1.5 z-50 text-xs text-slate-700">
              <button
                onClick={() => {
                  onOpenApp?.('settings');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>About NSK OS v0.3</span>
              </button>
              <button
                onClick={() => {
                  onOpenApp?.('settings');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>System Settings...</span>
              </button>
              <div className="h-px bg-slate-200/80 my-1" />
              <button
                onClick={() => {
                  onToggleWidget?.();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{widgetVisible ? 'Hide' : 'Show'} Resource Widget</span>
              </button>
              <div className="h-px bg-slate-200/80 my-1" />
              <button
                onClick={() => {
                  onOpenApp?.('settings');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-2 text-rose-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Factory Reset...</span>
              </button>
            </div>
          )}
        </div>

        {/* Focused Application Name in Bold */}
        <div className="px-2 py-0.5 font-bold text-slate-900 border-l border-slate-300/60 ml-1">
          {activeAppName || 'Finder'}
        </div>

        {/* Dynamic Menus based on Focused App */}
        <div className="hidden md:flex items-center">
          {appMenus.map((menu) => (
            <div key={menu.label} className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                className={`px-2 py-1 rounded-md text-slate-700 hover:text-slate-900 text-[13px] font-normal transition-colors ${
                  openMenu === menu.label ? 'bg-black/10' : 'hover:bg-black/5'
                }`}
              >
                {menu.label}
              </button>

              {openMenu === menu.label && (
                <div className="absolute top-8 left-0 min-w-44 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl py-1 z-50 text-xs text-slate-700">
                  {menu.items.map((it) => (
                    <button
                      key={it.label}
                      onClick={() => {
                        it.action();
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Preserved Developer Kernel View Switcher */}
      <div className="hidden lg:flex items-center bg-slate-200/50 p-0.5 rounded-lg border border-slate-300/40 text-xs">
        <button
          onClick={() => onViewChange('desktop')}
          className={`px-2.5 py-0.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
            currentView === 'desktop' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Desktop GUI</span>
        </button>

        <button
          onClick={() => onViewChange('serial')}
          className={`px-2.5 py-0.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
            currentView === 'serial' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>COM1 Boot</span>
        </button>

        <button
          onClick={() => onViewChange('source')}
          className={`px-2.5 py-0.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
            currentView === 'source' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Kernel Code</span>
        </button>

        <button
          onClick={() => onViewChange('verification')}
          className={`px-2.5 py-0.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
            currentView === 'verification' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Phase 1</span>
        </button>
      </div>

      {/* Right Side: Wi-Fi, Bluetooth, Volume, Battery, Control Center, Real-Time Date & Time */}
      <div className="flex items-center gap-2 sm:gap-3 text-slate-700 text-xs">
        {/* Bluetooth Icon */}
        <button
          onClick={() => setBluetoothOn(!bluetoothOn)}
          className={`p-1 rounded-md transition-colors ${bluetoothOn ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:bg-black/5'}`}
          title={bluetoothOn ? 'Bluetooth: On' : 'Bluetooth: Off'}
        >
          <Bluetooth className="w-3.5 h-3.5" />
        </button>

        {/* Wi-Fi Icon */}
        <button
          onClick={() => setWifiConnected(!wifiConnected)}
          className={`p-1 rounded-md transition-colors ${wifiConnected ? 'text-slate-700 hover:bg-black/5' : 'text-slate-400 hover:bg-black/5'}`}
          title={wifiConnected ? 'Wi-Fi: Connected (NSK Host)' : 'Wi-Fi: Disconnected'}
        >
          <Wifi className="w-3.5 h-3.5" />
        </button>

        {/* Volume Icon with Slider Popup */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'volume' ? null : 'volume')}
            className="p-1 rounded-md hover:bg-black/5 transition-colors"
            title={`Volume: ${isMuted ? 'Muted' : `${volume}%`}`}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {openMenu === 'volume' && (
            <div className="absolute top-8 right-0 w-44 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl p-3 z-50">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                <span>Volume</span>
                <span className="font-mono">{isMuted ? '0%' : `${volume}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseInt(e.target.value, 10));
                  setIsMuted(false);
                }}
                className="w-full accent-blue-600"
              />
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="mt-2 w-full py-1 text-center text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          )}
        </div>

        {/* Battery with percentage */}
        <div className="flex items-center gap-1 cursor-default text-xs font-medium" title="Battery: 85% (Power Adapter Connected)">
          <Battery className="w-4 h-4 text-slate-700" />
          <span>85%</span>
        </div>

        {/* Control Center Toggle */}
        <button
          onClick={() => setShowControlCenter(!showControlCenter)}
          className={`p-1 rounded-md transition-colors ${showControlCenter ? 'bg-blue-600 text-white' : 'hover:bg-black/5 text-slate-700'}`}
          title="Control Center & System Status"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Real-time Date and Time */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-300/60 font-medium text-slate-900 cursor-default">
          <span className="hidden sm:inline">{formattedDate}</span>
          <span className="font-mono">{formattedTime}</span>
        </div>
      </div>

      {/* Control Center Popup */}
      {showControlCenter && (
        <div className="absolute top-10 right-4 w-72 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-2xl p-4 z-50 text-xs text-slate-800 space-y-3">
          <div className="font-bold text-slate-900 text-sm mb-1">Control Center</div>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => setWifiConnected(!wifiConnected)}
              className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                wifiConnected ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${wifiConnected ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Wi-Fi</div>
                <div className="text-[10px] text-slate-400">{wifiConnected ? 'Host Net' : 'Off'}</div>
              </div>
            </div>

            <div
              onClick={() => setBluetoothOn(!bluetoothOn)}
              className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                bluetoothOn ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bluetoothOn ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                <Bluetooth className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Bluetooth</div>
                <div className="text-[10px] text-slate-400">{bluetoothOn ? 'Active' : 'Off'}</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Display Brightness</span>
              <span className="font-mono text-slate-500">100%</span>
            </div>
            <input type="range" min="20" max="100" defaultValue="100" className="w-full accent-blue-600" />
          </div>

          <button
            onClick={() => {
              onToggleWidget?.();
              setShowControlCenter(false);
            }}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-center"
          >
            {widgetVisible ? 'Hide Resource Monitor' : 'Show Resource Monitor'}
          </button>
        </div>
      )}
    </header>
  );
};
