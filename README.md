# AZMinifier

> AZMinifier for text files

<details>
<summary>Table of contents</summary>

<!-- toc -->

<!-- tocstop -->

</details>

Project links:

- GitHub: <https://github.com/matejkosiarcik/azminifier>
- DockerHub: <https://hub.docker.com/r/matejkosiarcik/azminifier>

| Platform  | Latest version                    |
|-----------|-----------------------------------|
| GitHub    | ![github release] <br> ![git tag] |
| DockerHub | ![dockerhub tag]                  |

[github release]: https://img.shields.io/github/v/release/matejkosiarcik/azminifier?sort=semver&style=flat-square&logo=github&logoColor=white&label=release
[git tag]: https://img.shields.io/github/v/tag/matejkosiarcik/azminifier?sort=semver&style=flat-square&logo=git&logoColor=white&label=git%20tag
[dockerhub tag]: https://img.shields.io/docker/v/matejkosiarcik/azminifier?sort=semver&style=flat-square&logo=docker&logoColor=white&label=image%20tag

## About

This project is in early stage of development.

## Usage

For minifying files in current directory, run:

```sh
docker run --rm -v "$PWD:/project" matejkosiarcik/azminifier:latest
```

Here is a list of all available CLI options:

```sh
$ docker run --rm -v "$PWD:/project" matejkosiarcik/azminifier:latest --help

azminifier [options] <path..>

Minify files

Positionals:
  path  Path to file/directory to minify  [string]

Options:
      --version  Show version number  [boolean]
  -h, --help     Show usage  [boolean]
  -v, --verbose  More logging  [boolean]
  -q, --quiet    Less logging  [boolean]
  -n, --dry-run  Dry run - just analyze, does not modify files  [boolean]
  -j, --jobs     Count of concurrent jobs to use (when set to "0" will use cpu-threads)  [number] [default: 0]
```

## Dev dependencies

Recommended software:

- `make` - with this you can run tasks such as `make bootstrap/build/clean/test/...`, see `Makefile` for all supported targets)

For native build:

- Recent version of `NodeJS`, `Python`, `Ruby` runtimes - for exact tested versions check files `.xyz-version`.
- `Git` (required for cloning dependencies)

For docker build:

- Docker

## License

This project is licensed under the MIT License,
see [LICENSE.txt](LICENSE.txt) for full license details.
