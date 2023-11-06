# Helper Makefile to group scripts for development

MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/sh
.SHELLFLAGS := -ec
PROJECT_DIR := $(abspath $(dir $(MAKEFILE_LIST)))

.POSIX:
.SILENT:

.DEFAULT: all
.PHONY: all
all: clean bootstrap build test docker-build

.PHONY: bootstrap
bootstrap:
	printf '%s\0%s\0' . minifiers | \
		xargs -0 -P0 -n1 npm ci --no-save --no-progress --no-audit --quiet --prefix

.PHONY: test
test: build
	npm test

.PHONY: build
build:
	npm run build
	npm run build --prefix minifiers

.PHONY: clean
clean:
	rm -rf "$(PROJECT_DIR)/node_modules" \
		"$(PROJECT_DIR)/minifiers/node_modules"

.PHONY: docker-build
docker-build:
	time docker build . --tag matejkosiarcik/universal-minifier:dev

.PHONY: docker-multibuild
docker-multibuild:
	time docker build . --tag matejkosiarcik/universal-minifier:dev-amd64 --platform linux/amd64
	time docker build . --tag matejkosiarcik/universal-minifier:dev-arm64 --platform linux/arm64
