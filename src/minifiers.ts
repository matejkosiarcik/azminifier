// import { ExecaReturnValue } from '@esm2cjs/execa';
import path from 'path';

import * as url from 'url';
import { customExeca } from './utils.js';
const __filename = url.fileURLToPath(import.meta.url);

const repoRootPath = path.dirname(path.dirname(path.resolve(__filename)));

export const minifierCommands = {
    yaml: ['node', path.join(repoRootPath, 'minifiers', 'yaml.js')],
};

export async function minifyYaml(file: string): Promise<boolean> {
    const command = await customExeca(['node', path.join(repoRootPath, 'minifiers', 'js', 'dist', 'yaml.js'), file]);
    if (command.exitCode !== 0) {
        console.error(`There was error minifying ${file}: ${command.all}`);
        return false;
    }
    return true;
}
