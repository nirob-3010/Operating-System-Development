import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface TerminalProps {
  initialCwd?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ initialCwd = '/home' }) => {
  const [inputCmd, setInputCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cwd, setCwd] = useState(initialCwd);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      setHistory(prev => [...prev, `nsk@nskos:${cwd}$ `]);
      return;
    }

    const tokens = trimmed.split(/\s+/);
    const command = tokens[0].toLowerCase();
    const arg = tokens.slice(1).join(' ');
    let response = '';

    switch (command) {
      case 'help':
        response = `NSK OS Built-in Shell v0.3 Commands:
  neofetch       - Display system specifications & NSK logo
  ls             - List directory contents
  pwd            - Print working directory
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

      case 'pwd':
        response = cwd;
        break;

      case 'uname':
        response = 'NSK-OS nsk-pc 0.3.0 #1 SMP PREEMPT Thu Oct 1 00:00:00 UTC 2026 i686 x86 GNU/NSK';
        break;

      case 'date':
        response = new Date().toUTCString();
        break;

      case 'clear':
        setHistory([]);
        setInputCmd('');
        return;

      case 'ls':
        response = 'Desktop/   Documents/   Downloads/   Pictures/   Music/   Videos/   Notes/   Applications/   Projects/   Trash/';
        break;

      case 'cd':
        if (!arg || arg === '~' || arg === '/home') {
          setCwd('/home');
        } else if (arg === '..') {
          setCwd('/home');
        } else {
          setCwd(`/home/${arg.replace(/^\//, '')}`);
        }
        response = '';
        break;

      case 'cat':
        if (!arg) {
          response = 'cat: missing file operand';
        } else if (arg.includes('welcome')) {
          response = 'Welcome to NSK OS v0.3!\nBare-metal 32-bit x86 Protected Mode OS with custom kernel and glass desktop.';
        } else if (arg.includes('spec')) {
          response = '# NSK OS Kernel Specs\nTarget: i686 x86 Protected Mode\nMultiboot2 specification compliant\nBitmap Physical Memory Manager\nKernel Heap kmalloc/kfree';
        } else {
          response = `cat: ${arg}: No such file or directory`;
        }
        break;

      case 'echo':
        response = arg;
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
        response = 'Simulating ACPI/QEMU reboot... Resetting OS state.';
        break;

      default:
        response = `bash: ${command}: command not found. Type 'help' for available commands.`;
        break;
    }

    setHistory(prev => [...prev, `nsk@nskos:${cwd}$ ${cmd}`, response]);
    setInputCmd('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(inputCmd);
    }
  };

  const pastelColors = [
    '#F87171', '#34D399', '#FBBF24', '#60A5FA',
    '#F472B6', '#38BDF8', '#FB923C', '#A78BFA',
  ];

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex-1 flex flex-col h-full bg-white/95 text-slate-800 font-mono text-[13px] overflow-hidden select-none"
    >
      {/* Tab bar */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-slate-200/80 bg-slate-100/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-0.5 shadow-2xs text-xs font-sans font-medium text-slate-700">
            <span>NSK Terminal</span>
            <X className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
          <button className="p-1 hover:bg-slate-200/60 rounded text-slate-500">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          bash 5.2 • UTF-8
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-4 overflow-y-auto leading-[19.5px] select-text">
        {/* Initial Neofetch Output */}
        <div className="mb-2">
          <span className="text-emerald-600 font-semibold">nsk@nskos</span>
          <span className="text-slate-400">:</span>
          <span className="text-blue-600 font-semibold">{cwd}</span>
          <span className="text-slate-700">$ neofetch</span>
        </div>

        {/* Neofetch Body */}
        <div className="flex items-start gap-5 py-1">
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

          <div className="w-[1px] h-[190px] bg-slate-200/80 my-auto"></div>

          <div className="flex-1 text-[12px] space-y-0.5 select-text pt-1">
            <div className="font-bold text-blue-600 text-[14px] pb-1">NSK OS v0.3</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Host</span>       : NSK-PC</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Kernel</span>     : 0.3.0 (i686 Protected Mode)</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Uptime</span>     : Live Session</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Shell</span>      : NSK Shell v0.3</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">FS</span>         : NSK Virtual Storage (/home)</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">DE</span>         : macOS-Inspired Glass Desktop</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">WM</span>         : NSK Window Manager</div>
            <div className="text-slate-700"><span className="text-blue-500 font-semibold">Theme</span>      : Light Glass</div>

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
          if (line.startsWith('nsk@nskos:')) {
            const parts = line.split('$ ');
            return (
              <div key={idx} className="mt-2">
                <span className="text-emerald-600 font-semibold">nsk@nskos</span>
                <span className="text-slate-400">:</span>
                <span className="text-blue-600 font-semibold">{parts[0].replace('nsk@nskos:', '')}</span>
                <span className="text-slate-700">$ {parts[1]}</span>
              </div>
            );
          }
          return (
            <div key={idx} className="text-slate-600 whitespace-pre-wrap font-mono text-xs my-0.5">
              {line}
            </div>
          );
        })}

        {/* Command Input Prompt */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-emerald-600 font-semibold">nsk@nskos</span>
          <span className="text-slate-400">:</span>
          <span className="text-blue-600 font-semibold">{cwd}</span>
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
    </div>
  );
};
