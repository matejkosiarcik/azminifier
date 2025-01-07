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
all: clean bootstrap build test docker-build docker-build-multiarch

.PHONY: bootstrap
bootstrap:
	# NodeJS
	printf 'cli minifiers tests ' | tr ' ' '\n' | while read -r dir; do \
		npm ci --no-save --no-progress --no-audit --no-fund --loglevel=error --prefix "$$dir" && \
	true ; done

	# Python
	cd "$(PROJECT_DIR)/minifiers" && \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
		python3 -m pip install --requirement requirements.txt --target "$$PWD/python-vendor" --quiet --upgrade && \
		cp "$(PROJECT_DIR)/minifiers/python-patches/minification.py.patch" "$(PROJECT_DIR)/minifiers/python-vendor/pyminifier" && \
		cd "$(PROJECT_DIR)/minifiers/python-vendor/pyminifier" && \
		patch <minification.py.patch

	gem install bundler

	# Gitman package
	cd "$(PROJECT_DIR)/docker-utils/dependencies/gitman" && \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
		python3 -m pip install --requirement requirements.txt --target "$$PWD/python-vendor" --quiet --upgrade

	# Gitman minifiers
	# printf ' '  | while read -r dir; do \
	# 	cd "$(PROJECT_DIR)/minifiers/gitman/$$dir" && \
	# 	PATH="$(PROJECT_DIR_FORPATH)/docker-utils/dependencies/gitman/python-vendor/bin:$$PATH" \
	# 	PYTHONPATH="$(PROJECT_DIR)/docker-utils/dependencies/gitman/python-vendor" \
	# 	PYTHONDONTWRITEBYTECODE=1 \
	# 		gitman install --quiet --force && \
	# true ; done

	# Gitman build utils
	printf 'node-build nodenv ' | tr ' ' '\n' | while read -r dir; do \
		cd "$(PROJECT_DIR)/docker-utils/dependencies/gitman/$$dir" && \
		PATH="$(PROJECT_DIR_FORPATH)/docker-utils/dependencies/gitman/python-vendor/bin:$$PATH" \
		PYTHONPATH="$(PROJECT_DIR)/docker-utils/dependencies/gitman/python-vendor" \
		PYTHONDONTWRITEBYTECODE=1 \
			gitman install --quiet --force && \
	true ; done

.PHONY: test
test:
	npm --prefix tests test

.PHONY: build
build:
	npm --prefix cli run build

.PHONY: docker-build
docker-build:
	time docker build . --tag matejkosiarcik/azminifier:dev

.PHONY: docker-build-multiarch
docker-build-multiarch:
	set -e && \
	printf '386 amd64 arm/v5 arm/v6 arm/v7 arm64/v8 ppc64le s390x ' | tr ' ' '\n' | \
		while read -r arch; do \
			printf 'Building for linux/%s:\n' "$$arch" && \
			time docker build . --tag "matejkosiarcik/azminifier:dev-$$(printf '%s' "$$arch" | tr '/' '-')" --platform "linux/$$arch" && \
		true; done

.PHONY: clean
clean:
	find "$(PROJECT_DIR)" -type d \( \
		-name "bundle" -or \
		-name ".bundle" -or \
		-name "dist" -or \
		-name "gitman-repositories" -or \
		-name "node_modules" -or \
		-name "python-vendor" -or \
		-name "venv" \
	\) -prune -exec rm -rf {} \;
