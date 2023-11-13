import path from 'path';
import fs from 'fs/promises';
import * as url from 'url';
import { customExeca, formatBytes } from './utils.ts';
import { minifyYamlCustom } from './custom-minifiers/yaml.ts';
import { log } from './log.ts';

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
}

async function minifyJavaScript(file: string): Promise<[boolean, string]> {
    const command = await customExeca(['terser', '--no-rename', file, '--output', file], {
        env: {
            PATH: `${process.env['PATH']}:${path.join(repoRootPath, 'minifiers', 'node_modules', '.bin')}`
        }
    });
    if (command.exitCode !== 0) {
        return [false, command.all ?? '<empty>'];
    }
    return [true, command.all ?? '<empty>'];
}

export async function minifyFile(file: string): Promise<boolean> {
    const extension = path.extname(file).slice(1);
    const filetype = (() => {
        switch (extension) {
            case 'yaml':
            case 'yml': {
                return 'YAML' as const;
            }
            case 'txt':
            case 'text': {
                return 'TEXT' as const;
            }
            case 'md':
            case 'markdown': {
                return 'MARKDOWN' as const;
            }
            case 'js':
            case 'mjs':
            case 'cjs': {
                return 'JAVASCRIPT' as const;
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
        return true;
    }

    const originalSize = (await fs.stat(file)).size;
    const originalContent = await fs.readFile(file);
    log.info(`Minifying ${filetype} file: ${file}`);

    const minifyStatus = await (async () => {
        switch (filetype) {
            case 'YAML': {
                return minifyYaml(file);
            }
            case 'TEXT': {
                return minifyPlainText(file);
            }
            case 'MARKDOWN': {
                return minifyPlainText(file);
            }
            case 'JAVASCRIPT': {
                return minifyJavaScript(file);
            }
            default: {
                return [true, ''] as const;
            }
        }
    })();

    if (!minifyStatus[0]) {
        await fs.writeFile(file, originalContent);
        // log.error(`There was error minifying ${file}: ${minifyStatus[1]}`);
        throw new Error(`There was error minifying ${file}: ${minifyStatus[1]}`);
        // return false;
    }

    const afterSize = (await fs.stat(file)).size;
    if (afterSize == originalSize) {
        await fs.writeFile(file, originalContent);
        log.debug(`File ${file} was not minified, size unchanged`);
        return true;
    } else if (afterSize > originalSize) {
        await fs.writeFile(file, originalContent);
        log.debug(`File ${file} was not minified, size increased by +${((afterSize / originalSize) * 100 - 100).toFixed(2)}% / +${formatBytes(afterSize - originalSize)}`);
        return true;
    }

    log.debug(`Minified file ${file}, size decreased by -${((afterSize / originalSize) * 100).toFixed(2)}% / -${formatBytes(originalSize - afterSize)}`);
    return true;
}
