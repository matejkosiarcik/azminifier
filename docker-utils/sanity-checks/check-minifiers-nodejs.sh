#!/bin/sh
set -euf

# YAML Minifier
tmpdir="$(mktemp -d)"
runYaml() {
    printf '%s\n' "$1" >"$tmpdir/file.yml"
    (cd "$tmpdir" && node "$YAML_MINIFIER" file.yml)
    find "$tmpdir" -mindepth 1 -maxdepth 1 -exec rm -rf {} \;
}

runYaml ''
runYaml 'foo'
runYaml '123'
runYaml '{ foo: bar }'
runYaml '[foo, bar]'
