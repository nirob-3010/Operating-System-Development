export type AppId =
  | 'files'
  | 'terminal'
  | 'browser'
  | 'photos'
  | 'calendar'
  | 'notes'
  | 'clock'
  | 'calculator'
  | 'settings';

export interface WindowState {
  id: AppId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  prevPosition?: { x: number; y: number };
  prevSize?: { width: number; height: number };
  zIndex: number;
  data?: any;
}

export interface DesktopShortcut {
  id: string;
  name: string;
  targetPath: string;
  x: number;
  y: number;
  iconType: 'home' | 'documents' | 'pictures' | 'music' | 'trash';
}
