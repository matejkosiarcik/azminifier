#!/bin/sh
set -euf

tmpdir="$(mktemp -d)"

ruby --version >/dev/null
ruby --help >/dev/null

bundle --version >/dev/null
bundle --help >/dev/null

runMinifyRb() {
    printf '%s\n' "$1" >"$tmpdir/file.rb"
    (cd "$tmpdir" && bundle exec minifyrb file.rb --output file.rb)
    find "$tmpdir" -mindepth 1 -maxdepth 1 -exec rm -rf {} \;
}

runMinifyRb 'puts "Hello World"'
