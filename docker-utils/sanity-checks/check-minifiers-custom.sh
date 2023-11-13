#!/bin/sh
set -euf

# YAML Minifier
tmpdir="$(mktemp -d)"

runYaml() {
    printf '%s\n' "$1" >"$tmpdir/file.yml"
    (cd "$tmpdir" && node "/app/dist/cli.js" .)
    find "$tmpdir" -mindepth 1 -maxdepth 1 -exec rm -rf {} \;
}

runYaml '"foo"'
runYaml 'foo:\n  - bar\n'
