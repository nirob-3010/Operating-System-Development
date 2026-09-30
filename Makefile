AS      = as
CC      = gcc
LD      = ld
GRUB    = grub-mkrescue

CFLAGS  = -m32 -ffreestanding -fno-pie -fno-stack-protector -O2 -Wall -Wextra
LDFLAGS = -m elf_i386 -T kernel/linker.ld

BUILD   = build
ISO_DIR = $(BUILD)/iso

KERNEL  = $(BUILD)/kernel.bin
ISO     = $(BUILD)/NSK-OS.iso

.PHONY: all clean

all: $(ISO)

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/wallpaper.o: kernel/wallpaper_rgb565.bin | $(BUILD)
	ld -m elf_i386 -r -b binary $< -o $@

$(BUILD)/boot.o: boot/boot.s | $(BUILD)
	$(AS) --32 $< -o $@

$(BUILD)/kernel.o: kernel/kernel.c kernel/wallpaper.h kernel/wallpaper_rgb565.bin | $(BUILD)
	$(CC) $(CFLAGS) -c $< -o $@

$(KERNEL): $(BUILD)/boot.o $(BUILD)/kernel.o $(BUILD)/wallpaper.o
	$(LD) $(LDFLAGS) -o $@ $^

$(ISO): $(KERNEL) boot/grub.cfg
	mkdir -p $(ISO_DIR)/boot/grub
	cp $(KERNEL) $(ISO_DIR)/boot/kernel.bin
	cp boot/grub.cfg $(ISO_DIR)/boot/grub/grub.cfg
	$(GRUB) -o $@ $(ISO_DIR)

clean:
	rm -rf $(BUILD)