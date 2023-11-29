#!/bin/sh
# This file performs removing dependency-tree files, which were unused during a previous sanity-check
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

# Remove empty directories
while [ "$(find "$1" -type d -empty | wc -l)" -ne 0 ]; do
    find "$1" -type d -empty -prune -exec rm -rf {} \;
done
