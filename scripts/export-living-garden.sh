#!/usr/bin/env bash
# The accepted art is imported byte-for-byte, never regenerated during a build.
set -euo pipefail
node scripts/import-living-garden.mjs "${1:-artifacts/frame-bud-bloom}"
