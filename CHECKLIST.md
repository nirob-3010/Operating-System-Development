# NSK OS v0.3 acceptance checklist

## Visual
- [ ] Supplied wallpaper is `/usr/share/backgrounds/nsk-wallpaper.jpg`.
- [ ] Top panel is 28 px and uses the light translucent treatment.
- [ ] NSK logo is used instead of an Apple logo.
- [ ] Desktop icons appear in the left column.
- [ ] Conky card is top-right with time, date, CPU, RAM and disk bars.
- [ ] Plank is bottom-center with eight requested launchers.
- [ ] Windows have rounded/shadowed light surfaces.
- [ ] XFWM buttons are on the left and use red/yellow/green traffic lights.

## Applications
- [ ] Thunar opens at `/home`.
- [ ] NSK Terminal opens with `nsk@nskos:~$` and runs neofetch.
- [ ] Neofetch shows NSK OS v0.3, NSK-PC, real kernel, uptime, shell,
      resolution, NSK Desktop, Window Manager, Light and Fluent.
- [ ] NSK Browser opens.
- [ ] Browser can navigate HTTP/HTTPS pages.
- [ ] Browser tabs work.
- [ ] Private tabs use an ephemeral WebKit context.
- [ ] Bookmarks and history persist for normal tabs.
- [ ] Downloads go to `~/Downloads`.
- [ ] Dark mode and desktop-site toggle work.
- [ ] HTML5 video can enter fullscreen.
- [ ] Ristretto opens images.
- [ ] Audacious opens music.
- [ ] XFCE Settings opens.

## Boot/build
- [ ] BIOS boot works.
- [ ] UEFI boot works.
- [ ] ISO is hybrid.
- [ ] GitHub Actions build completes.
- [ ] `sha256sum` is generated.
- [ ] Default live ISO is <= 500 MiB.
- [ ] `with_installer=true` produces the separate Calamares image.

## Known deviations
See the final section of `README.md`: raster-perfect equality cannot be
guaranteed across different display pipelines.
