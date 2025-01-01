import path from 'node:path';
import fs from 'node:fs/promises';
import * as url from 'node:url';
import { execa, formatBytes } from './utils/utils.ts';
import { ExecaError, Result as ExecaResult } from 'execa';
import { log } from './utils/log.ts';
import { minifyYamlCustom } from './custom-minifiers/yaml.ts';
import { minifyShellCustom } from './custom-minifiers/shell.ts';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = path.dirname(path.dirname(path.dirname(path.resolve(__filename))));

function getStatusForCommand(command: ExecaError | ExecaResult): MinifierReturnStatus {
    const results: MinifierReturnStatus = {
        status: command.exitCode === 0,
        message: '',
    };
    results.message = `Command \`${command.command}\` ${results.status ? 'succeeded' : 'failed'} with status code ${command.exitCode}\n---\n${command.all ?? '<empty>'}`
    return results;
}

export type MinifierReturnStatus = {
    status: boolean;
    message: string;
}

const binPaths = {
    python: path.join(repoRootPath, 'minifiers', 'python-vendor', 'bin'),
    nodeJs: path.join(repoRootPath, 'minifiers', 'node_modules', '.bin'),
};

const configPath = path.join(repoRootPath, 'minifiers', 'config');

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
async function minifyPlainText(file: string): Promise<MinifierReturnStatus> {
    try {
        const content = (await fs.readFile(file, 'utf8'))
            .split('\n').map((line) => line.replaceAll(/\s+$/g, '')).join('\n')
            .replaceAll(/\n\n\n+/gs, '\n\n')
            .replace(/\n\n$/s, '\n');
        await fs.writeFile(file, content, 'utf8');
        return {
            status: true,
            message: '',
        };
    } catch (error) {
        return {
            status: false,
            message: `${error}`,
        };
    }
}

async function minifyYaml(file: string): Promise<MinifierReturnStatus> {
    try {
        await minifyYamlCustom(file);
        return {
            status: true,
            message: '',
        };
    } catch (error) {
        return {
            status: false,
            message: `${error}`,
        };
    }

    // function getYamlPreambleVersion(yamlContent: string): '1.1' | '1.2' | undefined {
    //     const firstLine = yamlContent.split('\n')[0].trim();
    //     if (/^%YAML 1.1\s*$/.test(firstLine)) {
    //         return '1.1';
    //     } else if (/^%YAML 1.2\s*$/.test(firstLine)) {
    //         return '1.2';
    //     } else {
    //         return;
    //     }
    // }

    // let originalFileContent = await fs.readFile(file, 'utf-8');
    // const originalYamlPreambleVersion = getYamlPreambleVersion(originalFileContent);

    // let command: ExecaReturnValue<string>;
    // if (originalFileContent !== '') {
    //     command = await customExeca(['yq', '--yaml-output', '--in-place', '.', file], {
    //         env: {
    //             PATH: `${binPaths.python}${path.delimiter}${process.env['PATH']}`,
    //             PYTHONPATH: path.dirname(binPaths.python),
    //             PYTHONDONTWRITEBYTECODE: '1',
    //         }
    //     });
    //     if (command.exitCode !== 0) {
    //         return [false, command.all ?? '<empty>'];
    //     }
    // } else {
    //     return [true, ''];
    // }

    // // NOTE: Post-Process file
    // // - Add preamble if there was one before minifying
    // // - Remove trailing "..."
    // let fileContent = await fs.readFile(file, 'utf-8');
    // if (originalYamlPreambleVersion) {
    //     fileContent = `%YAML ${originalYamlPreambleVersion}\n---\n${fileContent}`;
    // }
    // fileContent = fileContent.replace(/[\s\n]*\.{3}[\s\n]*^/, '');
    // await fs.writeFile(file, fileContent, 'utf-8');

    // return [true, command.all ?? '<empty>'];
}


async function minifyXml(file: string, level: 'safe' | 'default' | 'brute'): Promise<MinifierReturnStatus> {
    const extraArgs = {
        safe: [],
        default: ['--collapse-whitespace-in-texts'],
        brute: ['--trim-whitespace-from-texts'],
    }[level];
    const command = await execa(['minify-xml', file, '--in-place', ...extraArgs], {
        env: {
            PATH: `${binPaths.nodeJs}${path.delimiter}${process.env['PATH']}`
        },
    });
    return getStatusForCommand(command);
}

async function minifyPython(file: string, level: 'safe' | 'default' | 'brute'): Promise<MinifierReturnStatus> {
    const filepath = path.resolve(file);
    const extraArgs = {
        safe: [],
        default: [],
        brute: ['--nonlatin'],
    }[level];

    const command = await execa(['pyminifier', '--use-tabs', ...extraArgs, `--outfile=${file}`, file], {
        env: {
            PATH: `${binPaths.python}${path.delimiter}${process.env['PATH']}`,
            PYTHONPATH: path.dirname(binPaths.python),
        },
    });

    const status = getStatusForCommand(command);

    const newFileContent = (await fs.readFile(filepath, 'utf8'))
        .replaceAll('\r\n', '\n')
        .replace(/#.+?\n$/g, '')
        .replace(/[\n\r]+$/, '');
    await fs.writeFile(filepath, newFileContent, 'utf8');

    return status;
}

async function minifyJavaScript(file: string): Promise<MinifierReturnStatus> {
    const command = await execa(['terser', '--no-rename', file, '--output', file, '--config-file', path.join(configPath, 'terser.default.config.json')], {
        env: {
            PATH: `${binPaths.nodeJs}${path.delimiter}${process.env['PATH']}`
        }
    });

    return getStatusForCommand(command);
}

async function minifyShell(file: string): Promise<MinifierReturnStatus> {
    try {
        await minifyShellCustom(file);
    } catch (error) {
        return {
            status: false,
            message: error instanceof Error ? error.message : `${error}`,
        };
    }

    return {
        status: true,
        message: '',
    };
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

    const minifyStatus: MinifierReturnStatus = await (async () => {
        switch (filetype) {
            case 'YAML': {
                return minifyYaml(file);
            }
            case 'XML': {
                return minifyXml(file, options.preset);
            }
            case 'Text': {
                return minifyPlainText(file);
            }
            case 'Markdown': {
                return minifyPlainText(file);
            }
            case 'JavaScript': {
                return minifyJavaScript(file);
            }
            case 'Python': {
                return minifyPython(file, options.preset);
            }
            case 'Shell': {
                return minifyShell(file);
            }
            default: {
                return { status: true, message: '' };
            }
        }
    })();

    if (!minifyStatus.status) {
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
