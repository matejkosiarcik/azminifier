#!/bin/sh
set -euf

if [ "$#" -ne 2 ]; then
    printf 'Expected 2 arguments, got %s arguments\n' "$#" >&2
    printf 'Usage: sh <script> <dependency-dir> <inotify-wait-file>\n' >&2
fi

dependency_dir="$1"
inotify_file="$2"

accesslist="$(mktemp)"
sort <"$inotify_file" | uniq >"$accesslist"

find "$dependency_dir" -type f | while read -r file; do
    if ! grep -- "$file" <"$accesslist" >/dev/null; then
        rm -f "$file"
    fi
done
rm -f "$accesslist"
