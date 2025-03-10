import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect } from '@playwright/test';
import { minifyFile } from '../../../cli/src/minifiers.ts';
import { setLogLevel } from '../../../cli/src/utils/log.ts';

export async function setupTest(): Promise<[string, string]> {
    const currDir = process.cwd();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'azminifier-tests-'));
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
    minifyOptions: { preset: 'safe' | 'default' | 'brute' }
}) {
    const filename = `file.${options.extension}`;
    await fs.writeFile(filename, options.input, 'utf8');

    await minifyFile(filename, options.minifyOptions);
    const minifiedContent = await fs.readFile(filename, 'utf8');
    expect(minifiedContent, 'File should be minified as expected').toEqual(options.output);

    await minifyFile(filename, options.minifyOptions);
    const minifiedContent2 = await fs.readFile(filename, 'utf8');
    expect(minifiedContent2, 'File should be minified as expected again').toEqual(options.output);
}
