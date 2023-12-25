# Helper Makefile to group scripts for development

MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/sh
.SHELLFLAGS := -ec
PROJECT_DIR := $(abspath $(dir $(MAKEFILE_LIST)))

.POSIX:
.SILENT:

.DEFAULT: all
.PHONY: all
all: clean bootstrap build test docker-build docker-multibuild

.PHONY: bootstrap
bootstrap:
	# NodeJS
	printf '%s\n%s\n' cli minifiers | while read dir; do \
		npm ci --no-save --no-progress --no-audit --quiet --prefix "$$dir" && \
	true ; done

	# Python
	printf '%s\n' minifiers | while read dir; do \
		cd "$(PROJECT_DIR)/$$dir" && \
		PIP_DISABLE_PIP_VERSION_CHECK=1 \
			python3 -m pip install --requirement requirements.txt --target "$$PWD/python" --quiet --upgrade && \
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
		"$(PROJECT_DIR)/minifiers/node_modules" \
		"$(PROJECT_DIR)/minifiers/python" \

.PHONY: docker-build
docker-build:
	time docker build . --tag matejkosiarcik/universal-minifier:dev

.PHONY: docker-multibuild
docker-multibuild:
	printf 'Build linux/amd64:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-x64 --platform linux/amd64
	docker tag matejkosiarcik/universal-minifier:dev-amd64 matejkosiarcik/universal-minifier:dev-x64

	printf 'Build linux/386:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-x86 --platform linux/386

	printf 'Build linux/arm64/v8:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-arm64-v8 --platform linux/arm64/v8

	printf 'Build linux/arm32/v7:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-arm32-v7 --platform linux/arm/v7
	docker tag matejkosiarcik/universal-minifier:dev-arm32-v7 matejkosiarcik/universal-minifier:dev-arm32

	printf 'Build linux/arm32/v5:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-arm32-v5 --platform linux/arm/v5

	# NOTE: Skipped because of emulation problems
	# printf 'Build linux/mips64le:\n'
	# time docker build . --tag matejkosiarcik/universal-minifier:dev-mips64le --platform linux/mips64le

	printf 'Build linux/ppc64le:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-ppc64le --platform linux/ppc64le

	printf 'Build linux/s390x:\n'
	time docker build . --tag matejkosiarcik/universal-minifier:dev-s390x --platform linux/s390x
