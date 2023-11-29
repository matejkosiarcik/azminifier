#!/bin/sh
set -euf

# shellcheck source=docker-utils/prune-dependencies/.common.sh
. "$(dirname "$0")/.common.sh"

removeHiddenDirectories python
removeHiddenFiles python
removeEmptyDirectories python
