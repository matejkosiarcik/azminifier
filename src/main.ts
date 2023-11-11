import { minifyFile } from './minifiers.ts';
import { findFiles } from './utils.ts';

export async function main(options: {
    paths: string[],
    jobs: number,
    log: 'verbose' | 'default' | 'quiet',
}) {
    const files = (await Promise.all(options.paths.map(async (el) => findFiles(el)))).flat();

    for (const file of files) {
        await minifyFile(file);
    }
}
