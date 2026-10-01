# ==============================================================================
# NSK OS v0.3 - Makefile
# Architecture: x86 (i686 32-bit Protected Mode)
# ==============================================================================

CC      := gcc
AS      := nasm
LD      := ld
OBJCOPY := objcopy

CFLAGS  := -m32 -ffreestanding -O2 -Wall -Wextra -nostdlib -fno-builtin \
           -fno-stack-protector -fno-pie -fno-pic -Iinclude
ASFLAGS := -f elf32
LDFLAGS := -m elf_i386 -T linker.ld -nostdlib -z noexecstack
LIBGCC  := $(shell $(CC) -m32 -print-libgcc-file-name 2>/dev/null)

BUILD_DIR := build
ISO_DIR   := isodir
ISO_NAME  := nsk-os-0.3.iso

C_SRCS := kernel/kernel.c \
          kernel/console.c \
          kernel/bga.c \
          kernel/gfx.c \
          kernel/font.c \
          kernel/wallpaper.c \
          kernel/mouse.c \
          kernel/keyboard.c \
          kernel/wm.c \
          kernel/phase2_demo.c \
          kernel/phase3_demo.c \
          kernel/gdt.c \
          kernel/idt.c \
          kernel/pic.c \
          kernel/pit.c \
          kernel/serial.c \
          kernel/printf.c \
          kernel/string.c \
          kernel/multiboot2.c \
          kernel/pmm.c \
          kernel/kheap.c \
          kernel/rtc.c \
          kernel/sysinfo.c

ASM_SRCS := boot/boot.asm \
            kernel/gdt_flush.asm \
            kernel/isr.asm

C_OBJS   := $(patsubst %.c, $(BUILD_DIR)/%.o, $(C_SRCS))
ASM_OBJS := $(patsubst %.asm, $(BUILD_DIR)/%.o, $(ASM_SRCS))
ALL_OBJS := $(ASM_OBJS) $(C_OBJS)

.PHONY: all iso run run-kernel clean test

all: $(BUILD_DIR)/kernel.bin

$(BUILD_DIR)/boot/%.o: boot/%.asm
	@mkdir -p $(dir $@)
	$(AS) $(ASFLAGS) $< -o $@

$(BUILD_DIR)/kernel/%.o: kernel/%.asm
	@mkdir -p $(dir $@)
	$(AS) $(ASFLAGS) $< -o $@

$(BUILD_DIR)/kernel/%.o: kernel/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/kernel.bin: $(ALL_OBJS) linker.ld
	@mkdir -p $(BUILD_DIR)
	$(LD) $(LDFLAGS) $(ALL_OBJS) $(LIBGCC) -o $@
	@echo ">>> [SUCCESS] Built Kernel Binary: $@"

iso: $(BUILD_DIR)/kernel.bin boot/grub.cfg
	@mkdir -p $(ISO_DIR)/boot/grub
	@cp $(BUILD_DIR)/kernel.bin $(ISO_DIR)/boot/kernel.bin
	@cp boot/grub.cfg $(ISO_DIR)/boot/grub/grub.cfg
	grub-mkrescue -o $(ISO_NAME) $(ISO_DIR) 2>/dev/null || \
	(echo "Notice: grub-mkrescue requires xorriso, mtools, grub-pc-bin. In local/CI environment, use build-iso workflow.")
	@echo ">>> [SUCCESS] Built Bootable ISO: $(ISO_NAME)"

run: iso
	qemu-system-i386 -m 256 -vga std -serial stdio -cdrom $(ISO_NAME)

run-kernel: $(BUILD_DIR)/kernel.bin
	qemu-system-i386 -m 256 -kernel $(BUILD_DIR)/kernel.bin -serial stdio

clean:
	rm -rf $(BUILD_DIR) $(ISO_DIR) $(ISO_NAME)
	@echo ">>> Cleaned build artifacts."
