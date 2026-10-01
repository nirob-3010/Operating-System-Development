#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
chmod +x scripts/*.sh
./scripts/download-base.sh
./scripts/build-rootfs.sh
./scripts/customize.sh
./scripts/configure-ui.sh
./scripts/build-iso.sh
./scripts/verify-iso.sh
