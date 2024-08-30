#!/bin/sh
set -euf

# shellcheck source=docker-utils/prune-dependencies/.common.sh
. "$(dirname "$0")/.common.sh"

removeHiddenDirectories python-vendor
removeHiddenFiles python-vendor
removeEmptyDirectories python-vendor
