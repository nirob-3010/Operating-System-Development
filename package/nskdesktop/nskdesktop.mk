################################################################################
#
# nskdesktop
#
################################################################################

NSKDESKTOP_VERSION = 1.0
NSKDESKTOP_SITE = $(BR2_EXTERNAL_NSKOS_PATH)/package/nskdesktop/src
NSKDESKTOP_SITE_METHOD = local

define NSKDESKTOP_BUILD_CMDS
	$(TARGET_CC) $(TARGET_CFLAGS) -O2 -pipe -Wall -Wextra -std=c11 \
		-D_GNU_SOURCE -o $(@D)/nskdesktop $(@D)/main.c -lm
endef

define NSKDESKTOP_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/nskdesktop $(TARGET_DIR)/usr/bin/nskdesktop
	$(INSTALL) -D -m 0644 $(BR2_EXTERNAL_NSKOS_PATH)/assets/wallpaper.rgb565 \
		$(TARGET_DIR)/usr/share/nsko/wallpaper.rgb565
	$(INSTALL) -D -m 0644 $(BR2_EXTERNAL_NSKOS_PATH)/board/nsko/inittab \
		$(TARGET_DIR)/etc/inittab
	mkdir -p $(TARGET_DIR)/home/Documents $(TARGET_DIR)/home/Pictures \
		$(TARGET_DIR)/home/Music $(TARGET_DIR)/home/Videos $(TARGET_DIR)/home/Downloads
endef

$(eval $(generic-package))
