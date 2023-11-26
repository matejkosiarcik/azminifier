import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

    await minifyFile(filename);
    const minifiedContent = await fs.readFile(filename, 'utf8');
    assert.strictEqual(minifiedContent, options.output, 'File should be minified as expected');

    await minifyFile(filename);
    const minifiedContent2 = await fs.readFile(filename, 'utf8');
    assert.strictEqual(minifiedContent2, options.output, 'File should be minified as expected again');
}
