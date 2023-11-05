import { customExeca, findFiles, listFiles } from './utils.js';
import { minifierCommands } from './minifiers.js';

export async function main(options: {
    paths: string[],
    jobs: number,
    log: 'verbose' | 'default' | 'quiet',
}) {
    console.log('options:', options);
    const files = (await Promise.all(options.paths.map(async (el) => findFiles(el)))).flat();
    console.log('files:', files);

    // const repoRootPath = path.dirname(path.dirname(path.resolve(__filename)));
    // const minifiersPath = path.join(repoRootPath, 'minifiers');

    const yamlFiles = listFiles(files, ['yaml', 'yml']);
    for (const file of yamlFiles) {
        console.log('Minifying', file);
        const command = await customExeca([...minifierCommands.yaml, file]);
        console.log('Minified result:', command);
    }
}
