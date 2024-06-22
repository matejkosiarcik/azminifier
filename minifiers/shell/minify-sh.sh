#!/usr/bin/env bash
set -o posix

input_file="$1"
eval $'content(){\n'"$(< "$input_file")"$'\n}'
declare -pf content
