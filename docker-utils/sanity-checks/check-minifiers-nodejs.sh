#!/bin/sh
set -euf

# YAML Minifier
tmpdir="$(mktemp -d)"

runTerser() {
    printf '%s\n' "$1" >"$tmpdir/file.js"
    (cd "$tmpdir" && terser file.js)
    find "$tmpdir" -mindepth 1 -maxdepth 1 -exec rm -rf {} \;
}

runTerser 'let foo = "foo"'
