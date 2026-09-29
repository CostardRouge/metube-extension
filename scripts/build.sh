#!/usr/bin/env bash
# Packages the extension into dist/metube-sender-<version>.zip and prints its path.
# The zip has manifest.json at its root: unzip it and use "Load unpacked", or upload
# it to the Chrome Web Store as-is.
#
# Usage: scripts/build.sh [expected-version]
#   expected-version  fail unless manifest.json has exactly this version (the release
#                     workflow passes the tag without its leading "v")
set -euo pipefail

cd "$(dirname "$0")/.."

# Everything the browser loads. Tests, docs, scripts and the icon source stay out.
# Add new top-level extension files or folders here.
FILES=(manifest.json background.js lib options popup ui icons/*.png)

version=$(node -p "require('./manifest.json').version")
if [[ $# -gt 0 && $1 != "$version" ]]; then
  echo "manifest.json has version $version, expected $1. Update \"version\" in manifest.json before tagging." >&2
  exit 1
fi

out="dist/metube-sender-$version.zip"
mkdir -p dist
rm -f "$out"
zip -r -X -q "$out" "${FILES[@]}" -x '*.DS_Store'
echo "$out"
