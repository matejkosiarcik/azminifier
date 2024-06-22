# Unnecessary minifier

> Unnecessary minifier for text files

<details>
<summary>Table of contents</summary>

<!-- toc -->

<!-- tocstop -->

</details>

## About

This project is in early stage of development.

## Usage

For minifying files in current directory, run:

```sh
docker run --rm -v "$PWD:/project" matejkosiarcik/unnecessary-minifier:latest
```

Here is a list of all available CLI options:

```sh
$ docker run --rm -v "$PWD:/project" matejkosiarcik/unnecessary-minifier:latest --help

uniminify [options] <path..>

Minify files

Positionals:
  path  Path to file/directory to minify  [string]

Options:
      --version  Show version number  [boolean]
  -h, --help     Show usage  [boolean]
  -v, --verbose  More logging  [boolean]
  -q, --quiet    Less logging  [boolean]
  -n, --dry-run  Dry run - just analyze, does not modify files  [boolean]
  -j, --jobs     Count of cocurrent jobs to use (when set to "0" will use cpu-threads)  [number] [default: 0]
```

## License

This project is licensed under the MIT License,
see [LICENSE.txt](LICENSE.txt) for full license details.
