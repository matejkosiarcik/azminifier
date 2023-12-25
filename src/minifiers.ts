import path from 'path';
import fs from 'fs/promises';
import * as url from 'url';
import { customExeca, formatBytes } from './utils.ts';
import { log } from './log.ts';
import { minifyYamlCustom } from './custom-minifiers/yaml.ts';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = path.dirname(path.dirname(path.resolve(__filename)));

/**
 * Remove trailing whitespace and multiple joined newlines
 */
async function minifyPlainText(file: string): Promise<[boolean, string]> {
    try {
        const content = (await fs.readFile(file, 'utf8'))
            .split('\n').map((line) => line.replaceAll(/\s+$/g, '')).join('\n')
            .replaceAll(/\n\n\n+/gs, '\n\n')
            .replace(/\n\n$/s, '\n');
        await fs.writeFile(file, content, 'utf8');
        return [true, ''];
    } catch (error) {
        return [false, `${error}`];
    }
}

// MARK: - Config files

async function minifyYaml(file: string): Promise<[boolean, string]> {
    try {
        await minifyYamlCustom(file);
        return [true, ''];
    } catch (error) {
        return [false, `${error}`];
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
    //             PATH: `${path.join(repoRootPath, 'minifiers', 'python', 'bin')}:${process.env['PATH']}`,
    //             PYTHONPATH: `${path.join(repoRootPath, 'minifiers', 'python')}`,
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

async function minifyXml(file: string, level: 'safe' | 'default' | 'brute'): Promise<[boolean, string]> {
    const extraArgs = {
        safe: [],
        default: ['--collapse-whitespace-in-texts'],
        brute: ['--trim-whitespace-from-texts'],
    }[level];
    const command = await customExeca(['minify-xml', file, '--in-place', ...extraArgs], {
        env: {
            PATH: `${path.join(repoRootPath, 'minifiers', 'node_modules', '.bin')}:${process.env['PATH']}`
        }
    });
    if (command.exitCode !== 0) {
        return [false, command.all ?? '<empty>'];
    }
    return [true, command.all ?? '<empty>'];
}

async function minifyJavaScript(file: string): Promise<[boolean, string]> {
    const command = await customExeca(['terser', '--no-rename', file, '--output', file], {
        env: {
            PATH: `${path.join(repoRootPath, 'minifiers', 'node_modules', '.bin')}:${process.env['PATH']}`
        }
    });
    if (command.exitCode !== 0) {
        return [false, command.all ?? '<empty>'];
    }
    return [true, command.all ?? '<empty>'];
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
    log.info(`Minifying ${filetype} file: ${file}`);

    const minifyStatus = await (async () => {
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
            default: {
                return [true, ''] as const;
            }
        }
    })();

    if (!minifyStatus[0]) {
        await fs.writeFile(file, originalContent);
        throw new Error(`There was error minifying ${file}:\n${minifyStatus[1]}`);
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
