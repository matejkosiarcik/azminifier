#!/usr/bin/env zsh
# TODO: Fix azlint shellcheck errors and rename file extension to .sh

input_file="$1"
eval $'content(){\n'"$(<"$input_file")"$'\n}'
declare -pf content
