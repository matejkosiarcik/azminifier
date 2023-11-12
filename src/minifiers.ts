import path from 'path';
import fs from 'fs/promises';
import * as url from 'url';
import { customExeca, formatBytes } from './utils.ts';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = path.dirname(path.dirname(path.resolve(__filename)));

/**
 * Remove trailing whitespace and multiple joined newlines
 */
async function minifyPlainText(file: string): Promise<boolean> {
    try {
        const content = (await fs.readFile(file, 'utf8'))
            .split('\n').map((line) => line.replaceAll(/\s+$/g, '')).join('\n')
            .replaceAll('\n\n\n', '\n\n')
            .replace(/\n\n$/s, '\n');
        await fs.writeFile(file, content, 'utf8');
        return true;
    } catch (error) {
        console.error(`There was error minifying ${file}: ${error}`);
        return false;
    }
}

// MARK: - Config files

export async function minifyYaml(file: string): Promise<[boolean, string]> {
    const command = await customExeca(['node', path.join(repoRootPath, 'minifiers', 'js', 'dist', 'yaml.js'), file]);
    if (command.exitCode !== 0) {
        console.error(`There was error minifying ${file}: ${command.all}`);
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
            default: {
                // TODO: Check if file is text file (by eg `file`)
                // and minify it with generic plaintext minifier
                return '' as const;
            }
        }
    })();

    if (filetype === '') {
        console.log(`Skipping file ${file} - Unsupported file type`);
        return true;
    }

    const originalSize = (await fs.stat(file)).size;
    const originalContent = await fs.readFile(file);
    console.log(`Minifying ${filetype} file: ${file}`);

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
            default: {
                return true;
            }
        }
    })();

    if (!minifyStatus) {
        await fs.writeFile(file, originalContent);
        return false;
    }

    const afterSize = (await fs.stat(file)).size;
    if (afterSize == originalSize) {
        await fs.writeFile(file, originalContent);
        console.log(`File ${file} was not minified, size unchanged`);
        return true;
    } else if (afterSize > originalSize) {
        await fs.writeFile(file, originalContent);
        console.log(`File ${file} was not minified, size increased by +${((afterSize / originalSize) * 100 - 100).toFixed(2)}% / +${formatBytes(afterSize - originalSize)}`);
        return true;
    }

    console.log(`Minified file ${file}, size decreased by -${((afterSize / originalSize) * 100).toFixed(2)}% / -${formatBytes(originalSize - afterSize)}`);
    return true;
}
