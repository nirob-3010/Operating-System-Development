.intel_syntax noprefix
.code32

/* ==============================================================================
 * NSK OS - Multiboot2 entry and x86-64 Long Mode transition
 * ============================================================================== */

.set MB1_MAGIC, 0x1BADB002
.set MB1_FLAGS, 0x00000007
.set MB1_CHECKSUM, -(MB1_MAGIC + MB1_FLAGS)

.set MULTIBOOT2_MAGIC, 0xE85250D6
.set MULTIBOOT2_ARCH_I386, 0

.section .multiboot1,"a"
.align 4
mb1_header:
    .long MB1_MAGIC
    .long MB1_FLAGS
    .long MB1_CHECKSUM
    .long 0, 0, 0, 0, 0
    .long 0
    .long 1536
    .long 1024
    .long 32

.section .multiboot2,"a"
.align 8
mb2_header_start:
    .long MULTIBOOT2_MAGIC
    .long MULTIBOOT2_ARCH_I386
    .long mb2_header_end - mb2_header_start
    .long -(MULTIBOOT2_MAGIC + MULTIBOOT2_ARCH_I386 + (mb2_header_end - mb2_header_start))

    .align 8
tag_information_request_start:
    .word 1
    .word 0
    .long tag_information_request_end - tag_information_request_start
    .long 4
    .long 6
    .long 8
tag_information_request_end:

    .align 8
tag_framebuffer_start:
    .word 5
    .word 1
    .long tag_framebuffer_end - tag_framebuffer_start
    .long 1536
    .long 1024
    .long 32
tag_framebuffer_end:

    .align 8
    .word 0
    .word 0
    .long 8
mb2_header_end:

.section .bss
.align 4096
boot_pml4:
    .skip 512 * 8
boot_pdpt:
    .skip 512 * 8
boot_pd:
    .skip 2048 * 8

.align 16
stack_bottom:
    .skip 16384
stack_top:

.align 8
boot_magic:
    .long 0
boot_info:
    .long 0

.section .data
.align 8
gdt64:
    .quad 0x0000000000000000
    .quad 0x00AF9A000000FFFF       /* 0x08: 64-bit kernel code */
    .quad 0x00CF92000000FFFF       /* 0x10: kernel data */
    .quad 0x00AFFA000000FFFF       /* 0x18: 64-bit user code */
    .quad 0x00CFF2000000FFFF       /* 0x20: user data */

gdt64_ptr:
    .word gdt64_end - gdt64 - 1
    .long gdt64
gdt64_end:

.section .text
.global _start
.type _start, @function
.extern kmain

_start:
    cli
    mov edi, OFFSET FLAT:boot_magic
    mov DWORD PTR [edi], eax
    mov DWORD PTR [edi + 4], ebx
    mov esp, OFFSET FLAT:stack_top
    cld

    /* Verify CPUID + long-mode support. */
    mov eax, 0x80000000
    cpuid
    cmp eax, 0x80000001
    jb .no_long_mode

    mov eax, 0x80000001
    cpuid
    bt edx, 29
    jnc .no_long_mode

    /* Clear the paging structures. */
    xor eax, eax
    mov edi, OFFSET FLAT:boot_pml4
    mov ecx, (512 * 8) / 4
    rep stosd

    mov edi, OFFSET FLAT:boot_pdpt
    mov ecx, (512 * 8) / 4
    rep stosd

    mov edi, OFFSET FLAT:boot_pd
    mov ecx, (2048 * 8) / 4
    rep stosd

    /* PML4[0] -> PDPT */
    mov edi, OFFSET FLAT:boot_pml4
    mov eax, OFFSET FLAT:boot_pdpt
    or eax, 0x003
    mov DWORD PTR [edi], eax

    /* PDPT[0..3] -> four 1-GiB regions. */
    mov edi, OFFSET FLAT:boot_pdpt
    mov eax, OFFSET FLAT:boot_pd
    or eax, 0x003
    mov DWORD PTR [edi + 0], eax
    add eax, 4096
    mov DWORD PTR [edi + 8], eax
    add eax, 4096
    mov DWORD PTR [edi + 16], eax
    add eax, 4096
    mov DWORD PTR [edi + 24], eax

    /* Identity map physical 0..4 GiB using 2-MiB pages. */
    mov edi, OFFSET FLAT:boot_pd
    xor eax, eax
    mov ecx, 2048
.map_2m:
    mov edx, eax
    or edx, 0x083               /* Present | RW | Page Size */
    mov DWORD PTR [edi], edx
    add edi, 8
    add eax, 0x00200000
    loop .map_2m

    /* Enable PAE. */
    mov eax, cr4
    or eax, (1 << 5)
    mov cr4, eax

    /* Load PML4. */
    mov eax, OFFSET FLAT:boot_pml4
    mov cr3, eax

    /* Enable EFER.LME. */
    mov ecx, 0xC0000080
    rdmsr
    or eax, (1 << 8)
    wrmsr

    /* Enable paging while protected mode is active. */
    mov eax, cr0
    or eax, (1 << 31)
    mov cr0, eax

    lgdt [gdt64_ptr]
    ljmp 0x08, OFFSET FLAT:.long_mode_entry

.no_long_mode:
    cli
.hang:
    hlt
    jmp .hang

.code64
.long_mode_entry:
    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov ss, ax
    xor ax, ax
    mov fs, ax
    mov gs, ax

    mov rsp, OFFSET FLAT:stack_top
    xor rbp, rbp

    mov edi, DWORD PTR [boot_magic]
    mov esi, DWORD PTR [boot_info]
    xor edx, edx
    call kmain

.halt:
    cli
    hlt
    jmp .halt
.size _start, .-_start
