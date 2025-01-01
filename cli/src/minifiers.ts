import path from 'node:path';
import fs from 'node:fs/promises';
import * as url from 'node:url';
import { execa, formatBytes } from './utils/utils.ts';
import { ExecaError, Result as ExecaResult } from 'execa';
import { log } from './utils/log.ts';
import { minifyYamlCustom } from './custom-minifiers/yaml.ts';
import { minifyShellCustom } from './custom-minifiers/shell.ts';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = (() => {
    const initialRepoPath = path.dirname(path.dirname(path.dirname(path.resolve(__filename))));
    return initialRepoPath === '/' ? '/app' : initialRepoPath;
})();

function getStatusForCommand(command: ExecaError | ExecaResult): void {
    if (command.exitCode === 0) {
        return;
    }

    throw new Error(`Command \`${command.command}\` failed with status code ${command.exitCode}\n---\n${command.all ?? '<empty>'}`);
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
async function minifyPlainText(file: string): Promise<void> {
    const content = (await fs.readFile(file, 'utf8'))
        .split('\n').map((line) => line.replaceAll(/\s+$/g, '')).join('\n')
        .replaceAll(/\n\n\n+/gs, '\n\n')
        .replace(/\n\n$/s, '\n');
    await fs.writeFile(file, content, 'utf8');
}

async function minifyYaml(file: string): Promise<void> {
    await minifyYamlCustom(file);

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

async function minifyXml(file: string, level: 'safe' | 'default' | 'brute'): Promise<void> {
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

async function minifyPython(file: string, level: 'safe' | 'default' | 'brute'): Promise<void> {
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

async function minifyJavaScript(file: string): Promise<void> {
    const command = await execa(['terser', '--no-rename', file, '--output', file, '--config-file', path.join(configPath, 'terser.default.config.json')], {
        env: {
            PATH: `${binPaths.nodeJs}${path.delimiter}${process.env['PATH']}`
        }
    });

    return getStatusForCommand(command);
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
