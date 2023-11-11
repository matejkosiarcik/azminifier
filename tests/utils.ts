import fs from 'fs/promises';
import YAML from 'yaml';
// import { expect } from 'chai';
import { minifyFile } from '../src/minifiers.ts';

export async function performSimpleTest(options: {
    input: string,
    output: string,
    extension: string,
}) {
    const filename = `file.${options.extension}`;
    await fs.writeFile(filename, options.input, 'utf8');

    const returnCode = await minifyFile(filename);
    expect(returnCode, 'File should be minified successfully with exit status 0').toEqual(true);

    const minifiedContent = await fs.readFile(filename, 'utf8');
    expect(minifiedContent, 'File should be minified as expected').toEqual(options.output);

    const isValid = (() => {
        try {
            YAML.parse(minifiedContent)
        } catch (error) {
            return false;
        }
        return true;
    })();
    expect(isValid, 'Minified YAML should be valid').toEqual(true);

    const returnCode2 = await minifyFile(filename);
    expect(returnCode2, 'File should be minified successfully again with exit status 0').toEqual(true);

    const minifiedContent2 = await fs.readFile(filename, 'utf8');
    expect(minifiedContent2, 'File should be minified as expected again').toEqual(options.output);
}
