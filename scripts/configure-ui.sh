#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.build"
ISO_ROOT="$WORK/iso-root"
INITRD_NAME="$(cat "$WORK/initrd-name.txt")"
INITRD_DIR="$WORK/custom-initrd"

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

[ -d "$ISO_ROOT" ] || err "Run build-rootfs.sh first"

[ -d "$INITRD_DIR" ] || err "Run build-rootfs.sh first"

# Work directly on the current custom initramfs staging tree.
mkdir -p "$INITRD_DIR"

# Desktop launcher .desktop files.
mkdir -p "$INITRD_DIR/usr/share/applications" "$INITRD_DIR/usr/share/icons/hicolor/48x48/apps"
cp -a "$ROOT/assets/icons/"*.png "$INITRD_DIR/usr/share/icons/hicolor/48x48/apps/"

cat > "$INITRD_DIR/usr/share/applications/nsk-launcher.desktop" <<'EOF2'
[Desktop Entry]
Type=Application
Name=NSK Launcher
Comment=Open the NSK OS application launcher
Exec=/usr/local/bin/nks-launcher
Icon=launcher
Terminal=false
Categories=Utility;System;
EOF2
cat > "$INITRD_DIR/usr/share/applications/nsk-terminal.desktop" <<'EOF2'
[Desktop Entry]
Type=Application
Name=NSK Terminal
Exec=aterm
Icon=terminal
Terminal=false
Categories=System;Utility;
EOF2
cat > "$INITRD_DIR/usr/share/applications/nsk-file-manager.desktop" <<'EOF2'
[Desktop Entry]
Type=Application
Name=File Manager
Exec=rox
Icon=file-manager
Terminal=false
Categories=Utility;System;
EOF2
cat > "$INITRD_DIR/usr/share/applications/nsk-settings.desktop" <<'EOF2'
[Desktop Entry]
Type=Application
Name=Settings
Exec=/usr/local/bin/nks-settings
Icon=settings
Terminal=false
Categories=Settings;System;
EOF2
cat > "$INITRD_DIR/usr/share/applications/nsk-monitor.desktop" <<'EOF2'
[Desktop Entry]
Type=Application
Name=System Monitor
Exec=/usr/local/bin/nks-monitor
Icon=monitor
Terminal=false
Categories=System;Utility;
EOF2

mkdir -p "$INITRD_DIR/etc/jwm"
cat > "$INITRD_DIR/etc/jwm/system.jwmrc" <<'JWM'
<?xml version="1.0"?>
<JWM>
  <RootMenu onroot="1234" height="24">
    <Program label="NSK Launcher" icon="/usr/share/icons/hicolor/48x48/apps/launcher.png">/usr/local/bin/nks-launcher</Program>
    <Separator/>
    <Program label="File Manager" icon="/usr/share/icons/hicolor/48x48/apps/file-manager.png">rox</Program>
    <Program label="NSK Terminal" icon="/usr/share/icons/hicolor/48x48/apps/terminal.png">aterm</Program>
    <Program label="Settings" icon="/usr/share/icons/hicolor/48x48/apps/settings.png">/usr/local/bin/nks-settings</Program>
    <Program label="System Monitor" icon="/usr/share/icons/hicolor/48x48/apps/monitor.png">/usr/local/bin/nks-monitor</Program>
    <Separator/>
    <Restart label="Restart Window Manager"/>
    <Exit label="Logout" confirm="true"/>
    <Program label="Power…" icon="/usr/share/icons/hicolor/48x48/apps/power.png">/usr/local/bin/nks-power</Program>
  </RootMenu>
  <WindowStyle>
    <Font>Sans-10</Font>
    <Width>5</Width>
    <Height>26</Height>
    <Corner>7</Corner>
    <Foreground>#1D2838</Foreground>
    <Background>#F5F9FF</Background>
    <Outline>#AEC7E6</Outline>
    <Opacity>0.97</Opacity>
    <Active>
      <Foreground>#0E223E</Foreground>
      <Background>#E7F2FF</Background>
      <Outline>#6CAFF2</Outline>
      <Opacity>0.99</Opacity>
    </Active>
  </WindowStyle>
  <TaskListStyle>
    <Font>Sans-9</Font>
    <Active><Foreground>#0E223E</Foreground><Background>#DDEEFF</Background></Active>
    <Foreground>#1D2838</Foreground><Background>#F5F9FF</Background>
    <Font>Sans-9</Font>
  </TaskListStyle>
  <MenuStyle>
    <Font>Sans-10</Font>
    <Foreground>#1D2838</Foreground>
    <Background>#F5F9FF</Background>
    <Outline>#AEC7E6</Outline>
    <Active><Foreground>#0E223E</Foreground><Background>#D9EDFF</Background></Active>
  </MenuStyle>
  <PopupStyle>
    <Font>Sans-9</Font>
    <Foreground>#1D2838</Foreground>
    <Background>#FFFFFF</Background>
  </PopupStyle>
  <Desktops width="2" height="1">
    <Background type="solid">#B8C9DE</Background>
  </Desktops>
  <FocusModel>click</FocusModel>
  <SnapMode distance="8">screen</SnapMode>
  <MoveMode>opaque</MoveMode>
  <ResizeMode>opaque</ResizeMode>
  <DoubleClickSpeed>400</DoubleClickSpeed>
  <Key mask="A" key="F4">close</Key>
  <Key mask="A" key="F10">maximize</Key>
  <Key mask="A" key="Tab">nextstacked</Key>
  <Key mask="A" key="F2">exec:aterm</Key>
</JWM>
JWM
cp "$INITRD_DIR/etc/jwm/system.jwmrc" "$INITRD_DIR/etc/system.jwmrc"
cp "$INITRD_DIR/etc/jwm/system.jwmrc" "$INITRD_DIR/home/tc/.jwmrc"
chown 1001:50 "$INITRD_DIR/home/tc/.jwmrc" 2>/dev/null || true

# tint2 top panel
mkdir -p "$INITRD_DIR/home/tc/.config/tint2"
cat > "$INITRD_DIR/home/tc/.config/tint2/nsk.tint2rc" <<'TINT'
panel_items = LTESC
panel_position = top_center horizontal
panel_size = 100% 36
panel_margin = 0 0
panel_padding = 6 3 6
panel_background_id = 1
wm_menu = 1
launcher_icon_theme = hicolor
launcher_padding = 4 0 6
launcher_icon_size = 22
launcher_item_app = /usr/share/applications/nsk-launcher.desktop
systray_padding = 4 2 4
systray_icon_size = 18
systray_sort = ascending
clock_format = %a, %d %b %Y    %H:%M
clock_font = Sans 9
clock_padding = 4 0
clock_lclick_command = /usr/local/bin/nks-settings
execp = 1
execp_command = /usr/local/bin/nks-status
execp_interval = 2
execp_font = Sans 9
execp_font_color = #233044 100
execp_padding = 4 0
execp_tooltip = NSK OS live status
battery_tooltip_enabled = 0
panel_background_id = 1
taskbar_mode = single_desktop
taskbar_padding = 2 1 2
taskbar_background_id = 1
taskbar_active_background_id = 2
task_text = 1
task_icon = 1
task_width = 220
task_centered = 1
rounded = 1
border_width = 1
border_sides = TBLR
background_color = #F7FBFF 92
border_color = #B6CDE7 70
background_color_hover = #E7F3FF 98
background_color_pressed = #D9EDFF 100
TINT

# ROX pinboard: actual desktop icons.
mkdir -p "$INITRD_DIR/home/tc/.config/rox.sourceforge.net/ROX-Filer"
cat > "$INITRD_DIR/home/tc/.config/rox.sourceforge.net/ROX-Filer/pb_NSK" <<'PB'
<?xml version="1.0"?>
<pinboard>
  <backdrop style="Stretched">/usr/local/share/backgrounds/nsk-wallpaper.png</backdrop>
  <icon x="34" y="56" label="Home">/home/tc</icon>
  <icon x="34" y="158" label="Documents">/home/tc/Documents</icon>
  <icon x="34" y="260" label="Pictures">/home/tc/Pictures</icon>
  <icon x="34" y="362" label="Music">/home/tc/Music</icon>
  <icon x="34" y="464" label="Videos">/home/tc/Videos</icon>
  <icon x="34" y="566" label="Downloads">/home/tc/Downloads</icon>
  <icon x="34" y="668" label="Trash">/home/tc/.Trash</icon>
  <icon x="34" y="770" label="Settings">/usr/local/bin/nks-settings</icon>
</pinboard>
PB

# User directories and a minimal Applications tree.
mkdir -p "$INITRD_DIR/home/tc"/{Documents,Pictures,Music,Videos,Downloads,.Trash}
chown -R 1001:50 "$INITRD_DIR/home/tc" 2>/dev/null || true

# Session: Xorg + JWM + pinboard + top panel + bottom dock.
cat > "$INITRD_DIR/home/tc/.xsession" <<'XSESS'
#!/bin/sh
# NSK OS graphical session.

# Best-effort wallpaper; feh is optional but included in the base package set.
if command -v feh >/dev/null 2>&1; then
  feh --bg-fill /usr/local/share/backgrounds/nsk-wallpaper.png >/dev/null 2>&1 &
fi

# Real desktop icons and file manager pinboard.
if command -v rox >/dev/null 2>&1; then
  rox -p=NSK >/dev/null 2>&1 &
fi

# Top panel and bottom dock.
if command -v tint2 >/dev/null 2>&1; then
  tint2 -c /home/tc/.config/tint2/nsk.tint2rc >/tmp/nsk-tint2.log 2>&1 &
fi
if command -v wbar >/dev/null 2>&1; then
  wbar -above-desk -pos bottom -isize 48 -jumpf 0.5 -zoomf 1.1 -balfa 55 -vbar off -nofont >/tmp/nsk-wbar.log 2>&1 &
fi

exec jwm >/tmp/nsk-jwm.log 2>&1
XSESS
chmod +x "$INITRD_DIR/home/tc/.xsession"

# wbar dock configuration, one real app per icon.
mkdir -p "$INITRD_DIR/home/tc/.wbar"
cat > "$INITRD_DIR/home/tc/.wbar/wbar.cfg" <<'WB'
i: /usr/share/icons/hicolor/48x48/apps/home.png
c: rox /home/tc
f: /usr/share/icons/hicolor/48x48/apps/terminal.png
c: aterm
f: /usr/share/icons/hicolor/48x48/apps/file-manager.png
c: rox
f: /usr/share/icons/hicolor/48x48/apps/settings.png
c: /usr/local/bin/nks-settings
f: /usr/share/icons/hicolor/48x48/apps/monitor.png
c: /usr/local/bin/nks-monitor
f: /usr/share/icons/hicolor/48x48/apps/power.png
c: /usr/local/bin/nks-power
WB

# The actual wbar syntax uses "i:" for icon and "c:" for command in recent builds.
# Also create a safe alternative script for older wbar syntax if needed.
cat > "$INITRD_DIR/usr/local/bin/nks-wbar-launch" <<'WB2'
#!/bin/sh
exec wbar -config /home/tc/.wbar/wbar.cfg -above-desk -pos bottom -isize 48 -zoomf 1.1 -jumpf 0.5 -balfa 55 -nofont
WB2
chmod +x "$INITRD_DIR/usr/local/bin/nks-wbar-launch"

ok "NSK OS UI configured"
