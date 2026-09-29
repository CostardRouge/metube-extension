#!/usr/bin/env bash
# Packages the extension into dist/metube-sender-<version>.zip and prints its path.
# The zip has manifest.json at its root: unzip it and use "Load unpacked", or upload
# it to the Chrome Web Store as-is.
#
# Usage: scripts/build.sh [version]
#   version  e.g. 1.2.0 (default: the one in manifest.json). It's written into the
#            zip's manifest.json; the repository's manifest.json isn't changed.
set -euo pipefail

fail() {
  # In GitHub Actions, the ::error:: prefix shows the message in the run's annotations.
  echo "${GITHUB_ACTIONS:+::error::}$*" >&2
  exit 1
}

cd "$(dirname "$0")/.."
root=$PWD

# Everything the browser loads. Tests, docs, scripts and the icon source stay out.
# Add new top-level extension files or folders here.
FILES=(manifest.json background.js lib options popup ui icons/*.png)

version=${1:-$(node -p "require('./manifest.json').version")}
# Chrome's format: 1 to 4 dot-separated integers from 0 to 65535, without leading zeros.
invalid="\"$version\" isn't a valid extension version: use 1 to 4 numbers separated by dots, e.g. 1.2.0."
[[ $version =~ ^(0|[1-9][0-9]{0,4})(\.(0|[1-9][0-9]{0,4})){0,3}$ ]] || fail "$invalid"
for part in ${version//./ }; do
  ((part <= 65535)) || fail "$invalid"
done

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
node -e '
  const [file, version] = process.argv.slice(1);
  const manifest = JSON.parse(require("fs").readFileSync(file, "utf8"));
  process.stdout.write(JSON.stringify({ ...manifest, version }, null, 2) + "\n");
' manifest.json "$version" > "$stage/manifest.json"

out="dist/metube-sender-$version.zip"
mkdir -p dist
rm -f "$out"
zip -r -X -q "$out" "${FILES[@]}" -x '*.DS_Store'
# Replace the zip's manifest.json with the one carrying the version.
(cd "$stage" && zip -X -q "$root/$out" manifest.json)
echo "$out"
