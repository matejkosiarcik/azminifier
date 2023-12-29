import path from 'path';
import fs from 'fs/promises';
import * as url from 'url';
import { customExeca, formatBytes } from './utils.ts';
import { log } from './utils/log.ts';
import { minifyYamlCustom } from './custom-minifiers/yaml.ts';
import { ExecaReturnValue } from '@esm2cjs/execa';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = path.dirname(path.dirname(path.dirname(path.resolve(__filename))));

function getStatusForCommand(command: ExecaReturnValue<string>): MinifierReturnStatus {
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
    python: path.join(repoRootPath, 'minifiers', 'python', 'bin'),
    nodeJs: path.join(repoRootPath, 'minifiers', 'node_modules', '.bin'),
};

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

// MARK: - Config files

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
    const command = await customExeca(['minify-xml', file, '--in-place', ...extraArgs], {
        env: {
            PATH: `${binPaths.nodeJs}${path.delimiter}${process.env['PATH']}`
        },
    });
    return getStatusForCommand(command);
}

async function minifyPython(file: string, level: 'safe' | 'default' | 'brute'): Promise<MinifierReturnStatus> {
    const filepath = path.resolve(file);
    console.log('FilePath:', filepath);

    const extraArgs = {
        safe: [],
        default: [],
        brute: ['--nonlatin'],
    }[level];

    // TODO: Remove following log
    console.log('LOG ENV:', {
        PATH: `${binPaths.python}${path.delimiter}${process.env['PATH']}`,
        PYTHONPATH: path.dirname(binPaths.python),
    });

    const command = await customExeca(['pyminifier', '--use-tabs', ...extraArgs, `--outfile=${file}`, file], {
        env: {
            PATH: `${binPaths.python}${path.delimiter}${process.env['PATH']}`,
            PYTHONPATH: path.dirname(binPaths.python),
        },
    });

    console.log('Command status:', command.exitCode);
    console.log('Command output:', command.all);
    console.log('Command signal:', command.signal);
    console.log('Command other:', command.isCanceled, command.failed);

    const status = getStatusForCommand(command);

    const filecontent = await fs.readFile(filepath, 'utf8');
    console.log('filecontent1:', filecontent, '---');
    const filecontent2 = filecontent.replace(/[#\#].+(\n|$)/g, '').replace(/[\n\r]+$/, '');
    console.log('filecontent2:', filecontent2, '---');
    await fs.writeFile(filepath, filecontent2, 'utf8');

    console.log('Post content1:', await fs.readFile(filepath, 'utf8'), '---');
    console.log('Post content2:', await fs.readFile(file, 'utf8'), '---');

    return status;
}

async function minifyJavaScript(file: string): Promise<MinifierReturnStatus> {
    const command = await customExeca(['terser', '--no-rename', file, '--output', file], {
        env: {
            PATH: `${binPaths.nodeJs}${path.delimiter}${process.env['PATH']}`
        }
    });

    return getStatusForCommand(command);
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
    if (afterSize == originalSize) {
        await fs.writeFile(file, originalContent);
        log.debug(`File ${file} was not minified, size unchanged`);
        return;
    } else if (afterSize > originalSize) {
        await fs.writeFile(file, originalContent);
        log.debug(`File ${file} was not minified, size increased by +${((afterSize / originalSize) * 100 - 100).toFixed(2)}% / +${formatBytes(afterSize - originalSize)}`);
        return;
    }

    log.debug(`Minified file ${file}, size decreased by -${((afterSize / originalSize) * 100).toFixed(2)}% / -${formatBytes(originalSize - afterSize)}`);
}
