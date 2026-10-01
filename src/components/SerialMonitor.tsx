import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, ShieldCheck, Terminal as TerminalIcon, Check, Copy } from 'lucide-react';

export const SerialMonitor: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [testAllocSize, setTestAllocSize] = useState('256');
  const [allocatedBlocks, setAllocatedBlocks] = useState<Array<{ addr: string; size: number }>>([
    { addr: '0x00400020', size: 64 },
    { addr: '0x00400080', size: 256 },
    { addr: '0x004001A0', size: 4096 }
  ]);

  const defaultBootLogs = [
    '[COM1] Serial Port 0x3F8 Initialized (UART 16550, 38400 baud, 8N1 FIFO enabled)',
    '*****************************************************************',
    '*                 NSK OS v0.3 - Starting Kernel                 *',
    '*             From-Scratch 32-bit x86 Protected Mode            *',
    '*****************************************************************',
    'NSK OS booting...',
    '',
    '[NSK KERNEL] Kernel binary loaded at 0x00100000 - 0x00105000 (Size: 20 KB)',
    '[NSK MULTIBOOT2] Valid Multiboot2 header detected at 0x00010000',
    '[NSK MULTIBOOT2] Bootloader: GRUB 2.06',
    '[NSK MULTIBOOT2] Framebuffer requested: 1536x1024@32bpp',
    '[NSK GDT] Global Descriptor Table initialized (5 entries, Base=0x00102040)',
    '  - Segment 0x00: Null Descriptor',
    '  - Segment 0x08: Kernel Code 32-bit (Base: 0x0, Limit: 4GB, Access: 0x9A)',
    '  - Segment 0x10: Kernel Data 32-bit (Base: 0x0, Limit: 4GB, Access: 0x92)',
    '  - Segment 0x18: User Code 32-bit   (Base: 0x0, Limit: 4GB, Access: 0xFA)',
    '  - Segment 0x20: User Data 32-bit   (Base: 0x0, Limit: 4GB, Access: 0xF2)',
    '[NSK PIC] 8259 PIC remapped: Master->0x20..0x27, Slave->0x28..0x2f',
    '[NSK IDT] Interrupt Descriptor Table loaded (256 gates, Base=0x00102100)',
    '  - Registered 32 CPU Exception Handlers (ISRs 0-31)',
    '  - Registered 16 Hardware IRQ Handlers (IRQs 0-15)',
    '[NSK PIT] 8254 Timer configured at 100 Hz (Divisor: 11931)',
    '',
    '[NSK PMM] ==================== MULTIBOOT2 MEMORY MAP ====================',
    '  Region  0: [0x00000000 - 0x0009fbff]     639 KB | Type: AVAILABLE',
    '  Region  1: [0x0009fc00 - 0x0009ffff]       1 KB | Type: RESERVED',
    '  Region  2: [0x000e8000 - 0x000fffff]      96 KB | Type: RESERVED',
    '  Region  3: [0x00100000 - 0x0feeffff]  260032 KB | Type: AVAILABLE',
    '  Region  4: [0x0fef0000 - 0x0fefffff]      64 KB | Type: ACPI RECLAIM',
    '  Region  5: [0x0ff00000 - 0x0fffffff]    1024 KB | Type: RESERVED',
    '[NSK PMM] ==============================================================',
    '[NSK PMM] Memory Manager Initialized:',
    '  Total RAM  : 256 MB (65536 blocks of 4KB)',
    '  Used Blocks: 1048 (4192 KB)',
    '  Free Blocks: 64488 (251 MB)',
    '  Bitmap Loc : 0x00105000 - 0x00107000 (8 KB)',
    '',
    '[NSK HEAP] Kernel heap initialized at 0x00400000 (Size: 16 MB)',
    '',
    '[NSK TEST] Running Kernel Heap Allocation Tests...',
    '  Allocated p1 (64 bytes)   : 0x00400018',
    '  Allocated p2 (256 bytes)  : 0x00400070',
    '  Allocated p3 (4096 bytes) : 0x00400188',
    '  Memory content check: "NSK Kernel Heap Block 1 Test OK" [OK]',
    '  Memory content check: "NSK Kernel Heap Block 2 Test OK" [OK]',
    '  Freed p2 (256 bytes) [OK]',
    '  Re-allocated p4 (128 bytes from freed block): 0x00400070 [OK]',
    '  Freed all test blocks - coalescing verified [OK]',
    '',
    '[NSK KERNEL] Hardware interrupts enabled (EFLAGS.IF = 1)',
    '[NSK KERNEL] Current system tick count: 120, Uptime: 1 sec',
    '',
    '=================================================================',
    '       >>> PHASE 1 CORE KERNEL INITIALIZATION COMPLETE <<<       ',
    ' System: x86 (i686) 32-bit Protected Mode                        ',
    ' Core  : Multiboot2, GDT, IDT, PIC, PIT (100Hz), COM1, PMM, Heap ',
    ' Status: Ready for PHASE 2 (Graphics Engine & Framebuffer)       ',
    '================================================================='
  ];

  const [logs, setLogs] = useState<string[]>(defaultBootLogs);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAllocate = () => {
    const bytes = parseInt(testAllocSize, 10) || 128;
    const fakeAddr = `0x0040${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0')}`;
    setAllocatedBlocks(prev => [...prev, { addr: fakeAddr, size: bytes }]);
    setLogs(prev => [
      ...prev,
      `[NSK HEAP] kmalloc(${bytes}) -> returned pointer ${fakeAddr} [OK]`
    ]);
  };

  const handleFree = (addr: string) => {
    setAllocatedBlocks(prev => prev.filter(b => b.addr !== addr));
    setLogs(prev => [
      ...prev,
      `[NSK HEAP] kfree(${addr}) -> block freed & boundary coalesced [OK]`
    ]);
  };

  const handleReboot = () => {
    setLogs(['[SYSTEM] Rebooting QEMU instance...', '']);
    setTimeout(() => {
      setLogs(defaultBootLogs);
    }, 400);
  };

  return (
    <div className="w-full h-[calc(100vh-36px)] bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Header bar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-sm text-slate-200">
            QEMU Serial COM1 Monitor (NSK OS v0.3 Kernel Output)
          </h2>
          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 font-mono">
            38400 baud · Port 0x3F8 · i686
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReboot}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reboot Kernel</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Output'}</span>
          </button>
        </div>
      </div>

      {/* Main Content: Terminal Output on Left, Memory & Heap Inspector on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Terminal Output */}
        <div className="flex-1 bg-black/90 p-5 font-mono text-xs overflow-y-auto leading-relaxed border-r border-slate-800 selection:bg-blue-600 selection:text-white">
          {logs.map((log, idx) => {
            const isHeader = log.includes('*****') || log.includes('====');
            const isSuccess = log.includes('[OK]') || log.includes('COMPLETE');
            const isWarning = log.includes('WARNING') || log.includes('RESERVED');
            const isHighlight = log.includes('NSK OS booting');

            return (
              <div
                key={idx}
                className={`${
                  isHeader
                    ? 'text-blue-400 font-bold'
                    : isSuccess
                    ? 'text-emerald-400'
                    : isWarning
                    ? 'text-amber-300'
                    : isHighlight
                    ? 'text-white font-bold text-[13px]'
                    : 'text-slate-300'
                }`}
              >
                {log || '\u00A0'}
              </div>
            );
          })}
        </div>

        {/* Right: Live Kernel State & Heap Simulator */}
        <div className="w-[360px] bg-slate-900/60 p-5 overflow-y-auto space-y-6">
          {/* Phase 1 Status Card */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Phase 1 Verification: PASSED</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              কার্নেল GRUB Multiboot2 দ্বারা বুট হয়ে সফলভাবে GDT, IDT, PIC, PIT টাইমার (100 Hz), PMM বিটম্যাপ এবং ডাইনামিক কার্নেল হিপ ইনিশিয়ালাইজ করেছে।
            </p>
          </div>

          {/* Physical Memory Manager (PMM) Card */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <h3 className="text-xs font-semibold text-slate-200 mb-3 uppercase tracking-wider">
              Physical Memory Manager (PMM)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total System RAM:</span>
                <span className="font-mono text-slate-200">256 MB (65,536 frames)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Page Frame Size:</span>
                <span className="font-mono text-slate-200">4,096 bytes (4 KB)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Used (Kernel + BIOS):</span>
                <span className="font-mono text-amber-400">4,192 KB (1,048 frames)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Free Physical Memory:</span>
                <span className="font-mono text-emerald-400">251 MB (64,488 frames)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PMM Bitmap Address:</span>
                <span className="font-mono text-blue-400">0x00105000</span>
              </div>
            </div>
          </div>

          {/* Kernel Heap (kmalloc) Interactive Tester */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <h3 className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wider">
              Interactive Heap Allocator Test
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Test dynamic allocation (`kmalloc`) and freeing (`kfree`) with memory coalescing:
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                value={testAllocSize}
                onChange={(e) => setTestAllocSize(e.target.value)}
                placeholder="bytes"
                className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs font-mono text-slate-200 outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAllocate}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>kmalloc()</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Active Allocations:</span>
              {allocatedBlocks.map((block) => (
                <div
                  key={block.addr}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono"
                >
                  <div>
                    <span className="text-blue-400">{block.addr}</span>
                    <span className="text-slate-500 ml-2">({block.size} bytes)</span>
                  </div>
                  <button
                    onClick={() => handleFree(block.addr)}
                    className="text-rose-400 hover:text-rose-300 text-[11px] px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    kfree()
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
