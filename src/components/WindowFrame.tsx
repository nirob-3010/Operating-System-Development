import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

interface WindowFrameProps {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onUpdatePosition: (pos: { x: number; y: number }) => void;
  onUpdateSize: (size: { width: number; height: number }, pos?: { x: number; y: number }) => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  minWidth?: number;
  minHeight?: number;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  isOpen,
  isMinimized,
  isMaximized,
  position,
  size,
  zIndex,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onUpdatePosition,
  onUpdateSize,
  children,
  icon,
  minWidth = 400,
  minHeight = 260,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    dir: ResizeDirection;
  }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
    dir: 'se',
  });

  // Handle Dragging
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMaximized) return; // Cannot drag while maximized
    onFocus();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: position.x,
      startY: position.y,
    };
    setIsDragging(true);
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - dragStartRef.current.mouseX;
    const dy = clientY - dragStartRef.current.mouseY;

    // Boundary constraints: Keep title bar on screen
    const desktopWidth = window.innerWidth;
    const desktopHeight = window.innerHeight - 36; // topbar height is 36

    let newX = dragStartRef.current.startX + dx;
    let newY = dragStartRef.current.startY + dy;

    // Clamping: Ensure at least 80px remains inside horizontally
    newX = Math.max(-size.width + 80, Math.min(desktopWidth - 80, newX));
    // Header cannot be dragged above topbar (0) or below desktop
    newY = Math.max(4, Math.min(desktopHeight - 60, newY));

    onUpdatePosition({ x: newX, y: newY });
  }, [onUpdatePosition, size.width]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle Resizing
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, dir: ResizeDirection) => {
    e.stopPropagation();
    if (isMaximized) return;
    onFocus();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    resizeStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: position.x,
      startY: position.y,
      startW: size.width,
      startH: size.height,
      dir,
    };
    setIsResizing(true);
  };

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - resizeStartRef.current.mouseX;
    const dy = clientY - resizeStartRef.current.mouseY;
    const { startX, startY, startW, startH, dir } = resizeStartRef.current;

    let newW = startW;
    let newH = startH;
    let newX = startX;
    let newY = startY;

    // Horizontal resize
    if (dir.includes('e')) {
      newW = Math.max(minWidth, startW + dx);
    } else if (dir.includes('w')) {
      const candidateW = startW - dx;
      if (candidateW >= minWidth) {
        newW = candidateW;
        newX = startX + dx;
      } else {
        newW = minWidth;
        newX = startX + (startW - minWidth);
      }
    }

    // Vertical resize
    if (dir.includes('s')) {
      newH = Math.max(minHeight, startH + dy);
    } else if (dir.includes('n')) {
      const candidateH = startH - dy;
      if (candidateH >= minHeight) {
        newH = candidateH;
        newY = startY + dy;
      } else {
        newH = minHeight;
        newY = startY + (startH - minHeight);
      }
    }

    onUpdateSize({ width: newW, height: newH }, { x: newX, y: newY });
  }, [minHeight, minWidth, onUpdateSize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global listeners for drag and resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResizeMove);
      window.addEventListener('touchend', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResizeMove);
        window.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  if (!isOpen || isMinimized) return null;

  // Maximize geometry: leave room above floating dock (dock is ~80px + padding)
  const windowStyle: React.CSSProperties = isMaximized
    ? {
        position: 'absolute',
        left: '8px',
        top: '6px',
        width: 'calc(100% - 16px)',
        height: 'calc(100% - 94px)',
        zIndex,
        transition: isDragging || isResizing ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    : {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease, opacity 0.2s ease',
      };

  return (
    <div
      style={windowStyle}
      onMouseDown={onFocus}
      className={`flex flex-col bg-white/95 backdrop-blur-2xl rounded-2xl border select-none overflow-hidden ${
        isActive
          ? 'border-white/90 shadow-2xl shadow-black/30 ring-1 ring-black/5'
          : 'border-white/60 shadow-lg shadow-black/15 opacity-95'
      }`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onDoubleClick={onToggleMaximize}
        className={`h-10 px-4 flex items-center justify-between border-b transition-colors cursor-move shrink-0 ${
          isActive
            ? 'bg-gradient-to-b from-white/95 to-slate-50/80 border-slate-200/80 text-slate-800'
            : 'bg-gradient-to-b from-white/80 to-slate-100/60 border-slate-200/50 text-slate-500'
        }`}
      >
        {/* Left: Traffic light window controls */}
        <div className="flex items-center gap-2">
          {/* Close */}
          <button
            title="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] hover:brightness-90 transition-all flex items-center justify-center group shadow-2xs cursor-pointer"
          >
            <X className="w-2.5 h-2.5 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Minimize */}
          <button
            title="Minimize"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] hover:brightness-90 transition-all flex items-center justify-center group shadow-2xs cursor-pointer"
          >
            <Minus className="w-2.5 h-2.5 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Maximize / Restore */}
          <button
            title={isMaximized ? 'Restore' : 'Maximize'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            className="w-3.5 h-3.5 rounded-full bg-[#27C93F] hover:brightness-90 transition-all flex items-center justify-center group shadow-2xs cursor-pointer"
          >
            {isMaximized ? (
              <Copy className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
              <Square className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>

        {/* Center: Title & Icon */}
        <div className="flex items-center gap-2 overflow-hidden px-2 max-w-[50%]">
          {icon && <span className="shrink-0">{icon}</span>}
          <span
            className={`text-[13px] font-semibold tracking-tight truncate ${
              isActive ? 'text-slate-800' : 'text-slate-500'
            }`}
          >
            {title}
          </span>
        </div>

        {/* Right: Quick Window Action Buttons */}
        <div className="flex items-center gap-2.5 text-slate-400">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Minimize"
            className="hover:text-slate-700 transition-colors p-0.5"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            title={isMaximized ? 'Restore Window' : 'Maximize Window'}
            className="hover:text-slate-700 transition-colors p-0.5"
          >
            {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close Window"
            className="hover:text-rose-600 transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </div>

      {/* Resize Handles (Only active when NOT maximized) */}
      {!isMaximized && (
        <>
          {/* Edges */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            onTouchStart={(e) => handleResizeStart(e, 'n')}
            className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 's')}
            onTouchStart={(e) => handleResizeStart(e, 's')}
            className="absolute bottom-0 left-3 right-3 h-2 cursor-ns-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            onTouchStart={(e) => handleResizeStart(e, 'w')}
            className="absolute top-3 bottom-3 left-0 w-1.5 cursor-ew-resize z-20"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            onTouchStart={(e) => handleResizeStart(e, 'e')}
            className="absolute top-3 bottom-3 right-0 w-2 cursor-ew-resize z-20"
          />

          {/* Corners */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            onTouchStart={(e) => handleResizeStart(e, 'nw')}
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            onTouchStart={(e) => handleResizeStart(e, 'ne')}
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            onTouchStart={(e) => handleResizeStart(e, 'sw')}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            onTouchStart={(e) => handleResizeStart(e, 'se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30"
          />
        </>
      )}
    </div>
  );
};
