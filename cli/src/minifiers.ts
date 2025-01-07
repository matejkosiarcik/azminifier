import path from 'node:path';
import fs from 'node:fs/promises';
import { execa, formatBytes } from './utils/utils.ts';
import { type ExecaError, type Result as ExecaResult } from 'execa';
import { log } from './utils/log.ts';
import { minifyYamlCustom } from './custom-minifiers/yaml.ts';
import { minifyShellCustom } from './custom-minifiers/shell.ts';
import { paths } from './utils/constants.ts';

function getStatusForCommand(command: ExecaError | ExecaResult): void {
    if (command.exitCode === 0) {
        return;
    }

    throw new Error(`Command \`${command.command}\` failed with status code ${command.exitCode}\n---\n${command.all ?? '<empty>'}`);
}

/**
 * Minify Windows and Legacy newlines into modern Linux newlines
 */
async function preminifyNewlines(file: string): Promise<void> {
    const content = (await fs.readFile(file, 'utf8'))
        .replaceAll('\n\r', '\n')
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n');
    await fs.writeFile(file, content, 'utf8');
}

/**
 * Remove trailing whitespace and multiple joined newlines
 */
async function minifyPlainText(file: string): Promise<void> {
    const content = (await fs.readFile(file, 'utf8'))
        .split('\n').map((line) => line.replaceAll(/\s+$/g, '')).join('\n')
        .replaceAll(/\n\n\n+/gs, '\n\n')
        .replace(/\n\n$/s, '\n');
    await fs.writeFile(file, content, 'utf8');
}

async function minifyYaml(file: string): Promise<void> {
    await minifyYamlCustom(file);
}

async function minifyXml(file: string, level: 'safe' | 'default' | 'brute'): Promise<void> {
    const extraArgs = {
        safe: [],
        default: ['--collapse-whitespace-in-texts'],
        brute: ['--trim-whitespace-from-texts'],
    }[level];
    const command = await execa(['minify-xml', file, '--in-place', ...extraArgs], {
        env: {
            PATH: `${paths.bin.nodeJs}${path.delimiter}${process.env['PATH']}`
        },
    });
    getStatusForCommand(command);
}

async function minifySvg(file: string): Promise<void> {
    const command = await execa(['svgo', '--input', file, '--output', file, '--config', path.join(paths.config, 'svgo.default.config.cjs')], {
        env: {
            PATH: `${paths.bin.nodeJs}${path.delimiter}${process.env['PATH']}`
        },
    });
    getStatusForCommand(command);
}

async function minifyPython(file: string, level: 'safe' | 'default' | 'brute'): Promise<void> {
    const filepath = path.resolve(file);
    const extraArgs = {
        safe: [],
        default: [],
        brute: ['--nonlatin'],
    }[level];

    const command = await execa(['pyminifier', ...extraArgs, `--outfile=${file}`, file], {
        env: {
            PATH: `${paths.bin.python}${path.delimiter}${process.env['PATH']}`,
            PYTHONPATH: path.dirname(paths.bin.python),
        },
    });

    getStatusForCommand(command);

    const newFileContent = (await fs.readFile(filepath, 'utf8'))
        .replaceAll('\r\n', '\n')
        .replace(/#.+?\n$/g, '')
        .replace(/[\n\r]+$/, '');
    await fs.writeFile(filepath, newFileContent, 'utf8');
}

async function minifyJavaScript(file: string): Promise<void> {
    const command = await execa(['terser', '--no-rename', file, '--output', file, '--config-file', path.join(paths.config, 'terser.default.config.json')], {
        env: {
            PATH: `${paths.bin.nodeJs}${path.delimiter}${process.env['PATH']}`
        }
    });

    getStatusForCommand(command);
}

async function minifyShell(file: string): Promise<void> {
    await minifyShellCustom(file);
}

export async function minifyFile(file: string, options: { preset: 'safe' | 'default' | 'brute' }) {
    const extension = path.extname(file).slice(1);
    const filetype = (() => {
        switch (extension) {
            case 'yaml':
            case 'yml': {
                return 'YAML' as const;
            }
            case 'xml': {
                return 'XML' as const;
            }
            case 'txt':
            case 'text': {
                return 'Text' as const;
            }
            case 'md':
            case 'mdown':
            case 'markdown': {
                return 'Markdown' as const;
            }
            case 'js':
            case 'mjs':
            case 'cjs': {
                return 'JavaScript' as const;
            }
            case 'py': {
                return 'Python' as const;
            }
            case 'svg': {
                return 'SVG' as const;
            }
            case 'bash':
            case 'sh':
            case 'zsh': {
                return 'Shell' as const;
            }
            default: {
                // TODO: Check if file is text file (by eg `file`)
                // and minify it with generic plaintext minifier
                return '' as const;
            }
        }
    })();

    if (filetype === '') {
        log.debug(`Skipping file ${file} - Unsupported file type`);
        return;
    }

    const originalSize = (await fs.stat(file)).size;
    const originalContent = await fs.readFile(file);
    log.debug(`Minifying ${filetype} file: ${file}`);

    await preminifyNewlines(file);

    const minifyStatus: Error | undefined = await (async () => {
        try {
            switch (filetype) {
                case 'YAML': {
                    await minifyYaml(file);
                    break;
                }
                case 'XML': {
                    await minifyXml(file, options.preset);
                    break;
                }
                case 'Text': {
                    await minifyPlainText(file);
                    break;
                }
                case 'Markdown': {
                    await minifyPlainText(file);
                    break;
                }
                case 'JavaScript': {
                    await minifyJavaScript(file);
                    break;
                }
                case 'Python': {
                    await minifyPython(file, options.preset);
                    break;
                }
                case 'Shell': {
                    await minifyShell(file);
                    break;
                }
                case 'SVG': {
                    await minifySvg(file);
                    break;
                }
            }
        } catch (error) {
            return error as Error;
        }
        return;
    })();

    if (minifyStatus) {
        await fs.writeFile(file, originalContent);
        throw new Error(`There was error minifying ${file}:\n${minifyStatus.message}`);
    }

    const afterSize = (await fs.stat(file)).size;
    if (afterSize > originalSize) {
        await fs.writeFile(file, originalContent);
        log.debug(`File ${file} was not minified, size increased by +${((afterSize / originalSize) * 100 - 100).toFixed(2)}% / +${formatBytes(afterSize - originalSize)}`);
        return;
    }

    log.debug(`Minified file ${file}, size decreased by -${((afterSize / originalSize) * 100).toFixed(2)}% / -${formatBytes(originalSize - afterSize)}`);
}
