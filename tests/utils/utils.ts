import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import YAML from 'yaml';
import { expect } from 'chai';
import { minifyFile } from '../../src/minifiers.ts';
import { setLogLevel } from '../../src/log.ts';

export async function setupTest(): Promise<[string, string]> {
    const currDir = process.cwd();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'universal-minifier-tests-'));
    process.chdir(tmpDir);
    setLogLevel('none');
    return [currDir, tmpDir];
}

export async function teardownTest(currDir: string, tmpDir: string) {
    process.chdir(currDir);
    await fs.rm(tmpDir, { force: true, recursive: true });
}

export async function performSimpleTest(options: {
    input: string,
    output: string,
    extension: string,
}) {
    const filename = `file.${options.extension}`;
    await fs.writeFile(filename, options.input, 'utf8');

    const returnCode = await minifyFile(filename);
    expect(returnCode, 'File should be minified successfully with exit status 0').eq(true);

    const minifiedContent = await fs.readFile(filename, 'utf8');
    expect(minifiedContent, 'File should be minified as expected').eq(options.output);

    const isValid = (() => {
        try {
            YAML.parse(minifiedContent)
        } catch (error) {
            return false;
        }
        return true;
    })();
    expect(isValid, 'Minified YAML should be valid').eq(true);

    const returnCode2 = await minifyFile(filename);
    expect(returnCode2, 'File should be minified successfully again with exit status 0').eq(true);

    const minifiedContent2 = await fs.readFile(filename, 'utf8');
    expect(minifiedContent2, 'File should be minified as expected again').eq(options.output);
}
