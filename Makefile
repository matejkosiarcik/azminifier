# Helper Makefile to group scripts for development

MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/sh
.SHELLFLAGS := -ec
PROJECT_DIR := $(abspath $(dir $(MAKEFILE_LIST)))

IS_MINGW := $(shell if uname -s | grep -E ^MINGW >/dev/null 2>&1; then printf 'y' ; else printf 'n' ; fi)
PROJECT_DIR_FORPATH := $(shell if [ "$(IS_MINGW)" = y ]; then printf '%s' "$(PROJECT_DIR)" | sed -E 's~^(.+):~/\L\1~'; else printf '%s' "$(PROJECT_DIR)"; fi)

.POSIX:
.SILENT:

.DEFAULT: all
.PHONY: all
all: clean bootstrap build test docker-build docker-multibuild

.PHONY: bootstrap
bootstrap:
	# NodeJS
	printf 'cli minifiers ' | tr ' ' '\n' | while read -r dir; do \
		npm ci --no-save --no-progress --no-audit --quiet --prefix "$$dir" && \
	true ; done

	# Python
	printf 'minifiers ' | tr ' ' '\n' | while read -r dir; do \
		cd "$(PROJECT_DIR)/$$dir" && \
		PIP_DISABLE_PIP_VERSION_CHECK=1 \
			python3 -m pip install --requirement requirements.txt --target "$$PWD/python" --quiet --upgrade && \
	true ; done

	# Gitman package
	cd "$(PROJECT_DIR)/docker-utils/dependencies/gitman" && \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
		python3 -m pip install --requirement requirements.txt --target "$$PWD/python" --quiet --upgrade

	# Gitman minifiers
	# printf ' '  | while read -r dir; do \
	# 	cd "$(PROJECT_DIR)/minifiers/gitman/$$dir" && \
	# 	PATH="$(PROJECT_DIR_FORPATH)/docker-utils/dependencies/gitman/python/bin:$$PATH" \
	# 	PYTHONPATH="$(PROJECT_DIR)/docker-utils/dependencies/gitman/python" \
	# 	PYTHONDONTWRITEBYTECODE=1 \
	# 		gitman install --quiet --force && \
	# true ; done

	# Gitman build utils
	printf 'node-build nodenv nodenv-installer nvm-installer ' | tr ' ' '\n' | while read -r dir; do \
		cd "$(PROJECT_DIR)/docker-utils/dependencies/gitman/$$dir" && \
		PATH="$(PROJECT_DIR_FORPATH)/docker-utils/dependencies/gitman/python/bin:$$PATH" \
		PYTHONPATH="$(PROJECT_DIR)/docker-utils/dependencies/gitman/python" \
		PYTHONDONTWRITEBYTECODE=1 \
			gitman install --quiet --force && \
	true ; done

.PHONY: test
test:
	npm --prefix cli test

.PHONY: build
build:
	npm --prefix cli run build

.PHONY: clean
clean:
	rm -rf \
		"$(PROJECT_DIR)/cli/dist" \
		"$(PROJECT_DIR)/cli/node_modules" \
		"$(PROJECT_DIR)/docker-utils/dependencies/gitman/python" \
		"$(PROJECT_DIR)/docker-utils/dependencies/gitman/venv" \
		"$(PROJECT_DIR)/docker-utils/dependencies/nodeenv/python" \
		"$(PROJECT_DIR)/docker-utils/dependencies/nodeenv/venv" \
		"$(PROJECT_DIR)/minifiers/node_modules" \
		"$(PROJECT_DIR)/minifiers/python"

	printf 'node-build nodenv nodenv-installer nvm-installer ' | tr ' ' '\n' | while read -r dir; do \
		rm -rf "$(PROJECT_DIR)/docker-utils/dependencies/gitman/$$dir/gitman" && \
	true ; done

.PHONY: docker-build
docker-build:
	time docker build . --tag matejkosiarcik/unnecessary-minifier:dev

.PHONY: docker-multibuild
docker-multibuild:
	set -e && \
	printf '386 amd64 arm/v5 arm/v6 arm/v7 arm64/v8 ppc64le s390x' | tr ' ' '\n' | \
		while read -r arch; do \
			printf 'Building for linux/%s:\n' "$$arch" && \
			time docker build . --tag "matejkosiarcik/unnecessary-minifier:dev-$$(printf '%s' "$$arch" | tr '/' '-')" --platform "linux/$$arch" && \
		true; done
