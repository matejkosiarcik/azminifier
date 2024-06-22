#!/usr/bin/env zsh

input_file="$1"
eval $'content(){\n'"$(<"$input_file")"$'\n}'
declare -pf content
