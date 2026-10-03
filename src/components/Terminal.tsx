import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, ChevronDown, X } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  zIndex: number;
  onFocus: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  zIndex,
  onFocus
}) => {
  const [pos, setPos] = useState({ x: 856, y: 461 });
  const [size, setSize] = useState({ w: 635, h: 392 });
  const [savedFrame, setSavedFrame] = useState({ x: 856, y: 461, w: 635, h: 392 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [interaction, setInteraction] = useState<'drag' | 'resize' | null>(null);
  const [resizeEdges, setResizeEdges] = useState({ left:false,right:false,top:false,bottom:false });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [inputCmd, setInputCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (!isOpen) return null;

  const beginDrag = (e: React.MouseEvent) => {
    if (isMaximized) return;
    setInteraction('drag');
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    onFocus();
  };

  const beginResize = (e: React.MouseEvent, edge: 'left'|'right'|'top'|'bottom'|'topleft'|'topright'|'bottomleft'|'bottomright') => {
    if (isMaximized) return;
    e.stopPropagation();
    setInteraction('resize');
    setResizeEdges({ left:edge.includes('left'), right:edge.includes('right'), top:edge.includes('top'), bottom:edge.includes('bottom') });
    setDragOffset({ x:e.clientX, y:e.clientY });
    onFocus();
  };

  useEffect(() => {
    if (!interaction) return;
    const move = (e: MouseEvent) => {
      if (interaction === 'drag') {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - dragOffset.x)),
          y: Math.max(36, Math.min(window.innerHeight - size.h - 12, e.clientY - dragOffset.y))
        });
      } else {
        const dx=e.clientX-dragOffset.x, dy=e.clientY-dragOffset.y;
        const minW=360, minH=240;
        let {x,y}=pos, {w,h}=size;
        if(resizeEdges.right) w=Math.max(minW,Math.min(window.innerWidth-x,w+dx));
        if(resizeEdges.bottom) h=Math.max(minH,Math.min(window.innerHeight-y-12,h+dy));
        if(resizeEdges.left){const nx=Math.max(0,Math.min(x+w-minW,x+dx));w+=x-nx;x=nx;}
        if(resizeEdges.top){const ny=Math.max(36,Math.min(y+h-minH,y+dy));h+=y-ny;y=ny;}
        setPos({x,y}); setSize({w,h}); setDragOffset({x:e.clientX,y:e.clientY});
      }
    };
    const up=()=>{setInteraction(null);setResizeEdges({left:false,right:false,top:false,bottom:false});};
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
    return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
  },[interaction,dragOffset,pos,size,resizeEdges]);

  const toggleMaximize=()=>{
    if(isMaximized){setPos({x:savedFrame.x,y:savedFrame.y});setSize({w:savedFrame.w,h:savedFrame.h});setIsMaximized(false);}
    else {setSavedFrame({x:pos.x,y:pos.y,w:size.w,h:size.h});setPos({x:8,y:42});setSize({w:Math.max(360,window.innerWidth-16),h:Math.max(240,window.innerHeight-96)});setIsMaximized(true);}
    onFocus();
  };

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      setHistory(prev => [...prev, 'nsk@nskos:~$ ']);
      return;
    }

    const tokens = trimmed.split(' ');
    const command = tokens[0].toLowerCase();
    let response = '';

    switch (command) {
      case 'help':
        response = `NSK OS Built-in Shell v0.3 Commands:
  neofetch       - Display system specifications & NSK logo
  ls             - List directory contents
  cd <dir>       - Change directory
  cat <file>     - Display file contents
  uname -a       - Show kernel architecture and release
  date           - Display system RTC timestamp
  meminfo        - Show Physical Memory Manager & Heap statistics
  clear          - Clear terminal history
  echo <text>    - Print text to stdout
  phase1         - Display Phase 1 compliance and status
  reboot         - Trigger simulated kernel reset`;
        break;

      case 'uname':
        response = 'NSK-OS nsk-pc 0.3.0 #1 SMP PREEMPT Thu Oct 1 00:00:00 UTC 2026 i686 x86 GNU/NSK';
        break;

      case 'date':
        response = 'Tue Sep 30 20:45:00 UTC 2026';
        break;

      case 'clear':
        setHistory([]);
        setInputCmd('');
        return;

      case 'ls':
        response = 'Documents/   Pictures/   Music/   Videos/   Downloads/   Trash/   welcome.txt';
        break;

      case 'cat':
        if (tokens[1] === 'welcome.txt') {
          response = 'Welcome to NSK OS v0.3!\nBuilt from scratch with custom 32-bit x86 kernel, Multiboot2, and PMM.';
        } else {
          response = `cat: ${tokens[1] || ''}: No such file or directory`;
        }
        break;

      case 'meminfo':
        response = `[PMM] Total RAM   : 256 MB (65,536 x 4KB frames)
[PMM] Used Frames : 1,048 (4,192 KB reserved)
[PMM] Free Frames : 64,488 (251 MB available)
[HEAP] Base Addr  : 0x00400000
[HEAP] Pool Size  : 16 MB
[HEAP] Allocations: Active: 3 | Coalesced: Verified`;
        break;

      case 'phase1':
        response = `NSK OS Phase 1 Core Kernel:
[+] Multiboot2 Header (0xE85250D6): OK
[+] 32-bit Protected Mode Entry: OK
[+] GDT (5 Segments, CS 0x08, DS 0x10): OK
[+] IDT (256 Gates & ISRs): OK
[+] 8259 PIC Remap (0x20..0x2F): OK
[+] 8254 PIT Timer (100 Hz): OK
[+] UART 16550 Serial COM1: OK
[+] Physical Memory Manager (Bitmap): OK
[+] Kernel Heap (kmalloc/kfree): OK`;
        break;

      case 'neofetch':
        response = '__NEOFETCH__';
        break;

      case 'reboot':
        response = 'Simulating ACPI/QEMU reboot... Resetting state.';
        break;

      default:
        response = `bash: ${command}: command not found. Type 'help' for available commands.`;
        break;
    }

    setHistory(prev => [...prev, `nsk@nskos:~$ ${cmd}`, response]);
    setInputCmd('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(inputCmd);
    }
  };

  const pastelColors = [
    '#F87171', '#34D399', '#FBBF24', '#60A5FA',
    '#F472B6', '#38BDF8', '#FB923C', '#A78BFA'
  ];

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
        zIndex
      }}
      onClick={() => {
        onFocus();
        inputRef.current?.focus();
      }}
      className="absolute bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl flex flex-col overflow-hidden select-none font-mono text-[13px]"
    >
      {/* Title Bar with Tabs */}
      <div
        onMouseDown={beginDrag}
        className="h-9 px-3 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-b from-white/95 to-slate-100/70 cursor-move"
      >
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
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
              onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
              title={isMaximized ? "Restore" : "Maximize"}
              className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-90 transition-all"
            />
          </div>

          {/* Active Tab */}
          <div className="flex items-center gap-2 bg-white/90 border border-slate-200/90 rounded-md px-3 py-1 shadow-2xs text-xs font-medium text-slate-700">
            <span>NSK Terminal</span>
            <X className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>

          {/* New Tab Button */}
          <button className="p-1 hover:bg-slate-200/60 rounded text-slate-500">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Window Controls */}
        <div className="flex items-center gap-3 text-slate-500">
          <ChevronDown className="w-3.5 h-3.5 hover:text-slate-700 cursor-pointer" />
          <button onClick={onClose} className="hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Canvas Body */}
      <div className="flex-1 p-4 overflow-y-auto leading-[19.5px] text-slate-800">
        {/* Initial Neofetch Output matching mockup */}
        <div className="mb-2">
          <span className="text-emerald-600 font-semibold">nsk@nskos</span>
          <span className="text-slate-400">:</span>
          <span className="text-blue-600 font-semibold">~</span>
          <span className="text-slate-700">$ neofetch</span>
        </div>

        {/* Neofetch Body: ASCII Logo on Left, Specs on Right */}
        <div className="flex items-start gap-5 py-1">
          {/* Ring ASCII Art */}
          <pre className="text-blue-600 text-[11px] leading-[13px] font-mono tracking-tight whitespace-pre select-text">
{`          .-/+oossoo+/-.
      \`:ssssssssssssssss+:\`
    \`:ssssssssssssssssssssss:\`
  \`:+ssssssssssssssssssssssss+:\`
 \`:ssssssss:          :ssssss:\`
 \`.osysssss-          -sssyyyo.\`
 :osssssss/            /sssssso:
\`+sssssso.              .ossssso+\`
\`osssssy/                /ssyssso\`
\`+sssss:                  :sssss+\`
:osssss/                  -osssso:
\`+ssssss+                +ssssss+\`
 \`:osssss-              -osssss:\`
  :osssss+              +ssssss:\`
   :oyyyyyy/---///---/+yyyyyyo:\`
    \`/ossssssssssssssssssso/\`
      \`:osssssssssssssso:\`
        \`.-/+ossssoo+-.`}
          </pre>

          {/* Divider */}
          <div className="w-[1px] h-[190px] bg-slate-200/80 my-auto"></div>

          {/* Specs Column */}
          <div className="flex-1 text-[12px] space-y-0.5 select-text pt-1">
            <div className="font-bold text-blue-600 text-[14px] pb-1">NSK OS v0.3</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Host</span>       : NSK-PC</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Kernel</span>     : 0.3.0</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Uptime</span>     : 3m</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Shell</span>      : bash</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Resolution</span> : 1024x768</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">DE</span>         : NSK Desktop</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">WM</span>         : Window Manager</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Theme</span>      : Light</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Icons</span>      : Fluent</div>

            {/* Pastel Color Blocks */}
            <div className="flex items-center gap-1.5 pt-3">
              {pastelColors.map((color, idx) => (
                <div
                  key={idx}
                  style={{ backgroundColor: color }}
                  className="w-4 h-3.5 rounded-xs shadow-2xs"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Command History */}
        {history.map((line, idx) => {
          if (line === '__NEOFETCH__') {
            return (
              <div key={idx} className="my-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                [Neofetch rendered above]
              </div>
            );
          }
          if (line.startsWith('nsk@nskos:~$')) {
            return (
              <div key={idx} className="mt-2">
                <span className="text-emerald-600 font-semibold">nsk@nskos</span>
                <span className="text-slate-400">:</span>
                <span className="text-blue-600 font-semibold">~</span>
                <span className="text-slate-700">{line.replace('nsk@nskos:~', '')}</span>
              </div>
            );
          }
          return (
            <div key={idx} className="text-slate-600 whitespace-pre-wrap font-mono text-xs my-0.5">
              {line}
            </div>
          );
        })}

        {/* Interactive Prompt Line */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-emerald-600 font-semibold">nsk@nskos</span>
          <span className="text-slate-400">:</span>
          <span className="text-blue-600 font-semibold">~</span>
          <span className="text-slate-700">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-slate-800 font-mono text-[13px] ml-1 p-0"
            autoFocus
          />
        </div>
        <div ref={terminalEndRef} />
      </div>
      <div onMouseDown={(e) => beginResize(e,'left')} className="absolute left-0 top-3 bottom-3 w-1 cursor-ew-resize" />
      <div onMouseDown={(e) => beginResize(e,'right')} className="absolute right-0 top-3 bottom-3 w-1 cursor-ew-resize" />
      <div onMouseDown={(e) => beginResize(e,'top')} className="absolute top-0 left-3 right-3 h-1 cursor-ns-resize" />
      <div onMouseDown={(e) => beginResize(e,'bottom')} className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize" />
      <div onMouseDown={(e) => beginResize(e,'topleft')} className="absolute left-0 top-0 w-3 h-3 cursor-nwse-resize" />
      <div onMouseDown={(e) => beginResize(e,'topright')} className="absolute right-0 top-0 w-3 h-3 cursor-nesw-resize" />
      <div onMouseDown={(e) => beginResize(e,'bottomleft')} className="absolute left-0 bottom-0 w-3 h-3 cursor-nesw-resize" />
      <div onMouseDown={(e) => beginResize(e,'bottomright')} className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize" />
    </div>
  );
};
