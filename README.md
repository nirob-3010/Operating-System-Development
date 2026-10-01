# NSK OS v0.3 (ফ্রম-স্ক্র্যাচ অপারেটিং সিস্টেম)

**NSK OS** হলো সম্পূর্ণ নিজস্ব কার্নেল, নিজস্ব মেমরি ম্যানেজার এবং নিজস্ব বুটযোগ্য GUI সহ একটি আধুনিক ৩২-বিট x86 (i686 Protected Mode) অপারেটিং সিস্টেম। এতে কোনো লিনাক্স বা দেবিয়ান ভিত্তিক উপাদান নেই — এটি সম্পূর্ণ স্ক্র্যাচ থেকে নির্মিত।

---

## 🚀 Phase 1: Boot & Core Kernel (সম্পূর্ণ)

Phase 1-এ কার্নেলের ভিত্তিপ্রস্তর সফলভাবে স্থাপিত হয়েছে:
1. **Multiboot2 বুট হেডার**: `boot/boot.asm` ফাইলটিতে GRUB Multiboot2 স্পেসিফিকেশন (`0xE85250D6`), ৩২-বিট প্রটেক্টেড মোড স্ট্যাক ইনিশিয়ালাইজেশন এবং মেমরি/ফ্রেমবাফার রিকোয়েস্ট ট্যাগ অন্তর্ভুক্ত।
2. **Global Descriptor Table (GDT)**: কার্নেল কোড, কার্নেল ডাটা, ইউজার কোড ও ইউজার ডাটার জন্য ৪ জিবি ফ্ল্যাট মেমরি সেগমেন্টেশন।
3. **Interrupt Descriptor Table (IDT)**: ২৫৬টি গেট সহ ৩২টি ইন্টেল সিপিইউ এক্সেপশন ও হার্ডওয়্যার ইন্টারাপ্ট হ্যান্ডলার।
4. **8259 PIC রিম্যাপিং**: IRQ 0-7 কে 0x20..0x27 এবং IRQ 8-15 কে 0x28..0x2F ভেক্টরে রিম্যাপ করা হয়েছে।
5. **8254 PIT টাইমার (100 Hz)**: প্রতি সেকেন্ডে ১০০ টিক ফ্রিকোয়েন্সিতে সুনির্দিষ্ট টাইমিং এবং আপটাইম ট্র্যাকিং।
6. **UART 16550 Serial Driver (COM1)**: 0x3F8 পোর্টে ৩৮৪০০ বড-রেটে সিরিয়াল ডিবাগিং ও লগিং।
7. **ফ্রি-স্ট্যান্ডিং `kprintf` ইঞ্জিন**: `%s`, `%d`, `%u`, `%x`, `%p`, `%c` ফরম্যাটিং সাপোর্ট।
8. **Physical Memory Manager (PMM)**: Multiboot2 মেমরি ম্যাপ পার্স করে বিটম্যাপের মাধ্যমে প্রতি ৪ কেবি পেজ ফ্রেম অ্যালোকেশন/ডিঅ্যালোকেশন।
9. **Kernel Heap Allocator (`kmalloc` / `kfree`)**: ৪ মেগাবাইট মার্ক থেকে ১৬ মেগাবাইট ডাইনামিক হিপ পুল, বাউন্ডারি ট্যাগ এবং ফ্রি ব্লক কোয়ালেসিং সাপোর্ট।

---

## 📁 Repository Structure (Phase 1)

```
├── boot/
│   ├── boot.asm             # Multiboot2 header & 32-bit protected mode entry
│   └── grub.cfg             # GRUB Multiboot2 bootloader configuration
├── include/
│   ├── gdt.h                # Global Descriptor Table declarations
│   ├── idt.h                # Interrupt Descriptor Table & ISR types
│   ├── io.h                 # Inline x86 assembly I/O port helpers (inb, outb)
│   ├── kheap.h              # Dynamic kernel heap allocator declarations
│   ├── multiboot2.h         # Multiboot2 tags & memory structures
│   ├── pic.h                # 8259 Programmable Interrupt Controller
│   ├── pit.h                # 8254 Programmable Interval Timer (100 Hz)
│   ├── pmm.h                # Physical Memory Manager (bitmap page frame allocator)
│   ├── printf.h             # Kernel kprintf declarations
│   ├── serial.h             # COM1 UART 16550 serial port driver
│   ├── string.h             # Freestanding string and memory operations
│   └── types.h              # Fixed-width integer and standard freestanding types
├── kernel/
│   ├── gdt.c                # GDT setup (Kernel/User Code & Data segments)
│   ├── gdt_flush.asm        # Assembly segment reloading and far jump
│   ├── idt.c                # IDT setup, exception & IRQ dispatcher
│   ├── isr.asm              # 32 CPU exception stubs & 16 IRQ stubs
│   ├── kernel.c             # Kernel kmain entry, boot flow & self-tests
│   ├── kheap.c              # kmalloc, kfree, kcalloc, krealloc implementation
│   ├── multiboot2.c         # Multiboot2 tag parser
│   ├── pic.c                # 8259 PIC cascade remapping & EOI handler
│   ├── pit.c                # 8254 PIT timer driver (100 Hz frequency)
│   ├── pmm.c                # Bitmap page frame allocator from mmap
│   ├── printf.c             # Formatted output to serial & console
│   ├── serial.c             # UART 16550 COM1 serial port driver
│   └── string.c             # memcpy, memset, strlen, strcmp, etc.
├── tests/
│   └── test_phase1.py       # Automated QEMU serial smoke test
├── .github/workflows/
│   └── build-iso.yml        # GitHub Actions CI for compiling & ISO build
├── linker.ld                # Linker script (1MB base load, 4KB section align)
├── Makefile                 # Build targets: all, iso, run, test, clean
└── README.md                # Documentation
```

---

## 🛠️ How to Build and Run (কিভাবে বিল্ড ও রান করবেন)

### প্রয়োজনীয় টুলস:
- `gcc` (with `-m32` support: `gcc-multilib`)
- `nasm` (Netwide Assembler)
- `ld` (GNU Binutils)
- `qemu-system-i386` (QEMU x86 emulator)
- `grub-pc-bin`, `xorriso`, `mtools` (for creating bootable ISO)

### ১. কার্নেল কম্পাইল করা:
```bash
make all
```
এটি `build/kernel.bin` তৈরি করবে।

### ২. বুটযোগ্য ISO তৈরি করা:
```bash
make iso
```
এটি `nsk-os-0.3.iso` তৈরি করবে (সাইজ ২০ মেগাবাইটের অনেক নিচে, মাত্র ~৮ মেগাবাইট)।

### ৩. QEMU এ সরাসরি টেস্ট করা:
```bash
make run
```
অথবা সরাসরি কার্নেল বাইনারি টেস্ট করতে:
```bash
make run-kernel
```

### প্রত্যাশিত বুট আউটপুট (QEMU Serial COM1):
```
*****************************************************************
*                 NSK OS v0.3 - Starting Kernel                 *
*             From-Scratch 32-bit x86 Protected Mode            *
*****************************************************************
NSK OS booting...

[NSK KERNEL] Kernel binary loaded at 0x00100000 - 0x00105000 (Size: 20 KB)
[NSK MULTIBOOT2] Valid Multiboot2 header detected at 0x00010000
[NSK MULTIBOOT2] Bootloader: GRUB 2.06
[NSK GDT] Global Descriptor Table initialized (5 entries, Base=0x00102040)
[NSK PIC] 8259 PIC remapped: Master->0x20..0x27, Slave->0x28..0x2f
[NSK IDT] Interrupt Descriptor Table loaded (256 gates, Base=0x00102100)
[NSK PIT] 8254 Timer configured at 100 Hz (Divisor: 11931)

[NSK PMM] ==================== MULTIBOOT2 MEMORY MAP ====================
  Region  0: [0x00000000 - 0x0009fbff]     639 KB | Type: AVAILABLE
  Region  1: [0x0009fc00 - 0x0009ffff]       1 KB | Type: RESERVED
  Region  2: [0x000e8000 - 0x000fffff]      96 KB | Type: RESERVED
  Region  3: [0x00100000 - 0x0feeffff]  260032 KB | Type: AVAILABLE
  Region  4: [0x0fef0000 - 0x0fefffff]      64 KB | Type: ACPI RECLAIM
  Region  5: [0x0ff00000 - 0x0fffffff]    1024 KB | Type: RESERVED
[NSK PMM] ==============================================================
[NSK PMM] Memory Manager Initialized:
  Total RAM  : 256 MB (65536 blocks of 4KB)
  Used Blocks: 1048 (4192 KB)
  Free Blocks: 64488 (251 MB)
  Bitmap Loc : 0x00105000 - 0x00107000 (8 KB)

[NSK HEAP] Kernel heap initialized at 0x00400000 (Size: 16 MB)

[NSK TEST] Running Kernel Heap Allocation Tests...
  Allocated p1 (64 bytes)   : 0x00400018
  Allocated p2 (256 bytes)  : 0x00400070
  Allocated p3 (4096 bytes) : 0x00400188
  Memory content check: "NSK Kernel Heap Block 1 Test OK" [OK]
  Memory content check: "NSK Kernel Heap Block 2 Test OK" [OK]
  Freed p2 (256 bytes) [OK]
  Re-allocated p4 (128 bytes from freed block): 0x00400070 [OK]
  Freed all test blocks - coalescing verified [OK]

[NSK KERNEL] Hardware interrupts enabled (EFLAGS.IF = 1)
[NSK KERNEL] Current system tick count: 1, Uptime: 0 sec

=================================================================
       >>> PHASE 1 CORE KERNEL INITIALIZATION COMPLETE <<<       
 System: x86 (i686) 32-bit Protected Mode                        
 Core  : Multiboot2, GDT, IDT, PIC, PIT (100Hz), COM1, PMM, Heap 
 Status: Ready for PHASE 2 (Graphics Engine & Framebuffer)       
=================================================================
```

---

## 🎯 পরবর্তী ধাপ: Phase 2
পরবর্তী ধাপে (`PHASE 2 - Graphics engine`) যুক্ত হবে:
- 1536x1024x32 লিনিয়ার ফ্রেমবাফার ড্রাইভার ও ডাবল বাফারিং (Back Buffer)
- অ্যান্টি-অ্যালিয়াসড রাউন্ডেড রেকট্যাঙ্গেল ও আলফা ব্লেন্ডিং
- ফাস্ট বক্স ব্লার (গ্লাস প্যানেলের জন্য)
- `stb_truetype` ফন্ট রেন্ডারার
- ওয়ালপেপার বিটম্যাপ ইন্টিগ্রেশন

---

## Asset tools

The wallpaper and the mouse cursor are generated, not hand-edited:

```bash
# Wallpaper: HOME.PNG -> kernel/wallpaper_home.h (24-bit, 768x512) + web preview JPEGs
python3 tools/gen_wallpaper.py HOME.PNG \
    --web src/assets/images/wallpaper_nsk_1790838490517.jpg

# Cursor: anti-aliased arrow with outline + soft shadow -> include/cursor_sprite.h
python3 tools/gen_cursor.py --preview /tmp/cursor_preview.png
```

Both need `pip install pillow`. The wallpaper is "cover" fitted at boot, so it is never
stretched on non-3:2 screens. If you change the cursor size in `tools/gen_cursor.py`,
update `MOUSE_CURSOR_*` in `include/mouse.h` too (a `_Static_assert` in `mouse.c` catches a mismatch).
