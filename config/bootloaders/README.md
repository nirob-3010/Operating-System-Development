The binary bootloader assets are staged under `config/includes.binary/` because
live-build generates its BIOS/UEFI loader tree during the binary phase.

`config/hooks/normal/900-nsk-boot.hook.binary` applies the NSK menu colors after
live-build has generated the loader configuration.

`splash.png` is generated from the supplied wallpaper and used as the visual
boot reference.
