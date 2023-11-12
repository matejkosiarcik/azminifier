import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import { performSimpleTest } from '../utils.ts';
// import { describe, expect, test } from '@jest/globals';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'txt',
    });
}

context('Minify Plain Text', function () {
    let tmpDir: string;
    let currDir: string;

    this.beforeEach(async function () {
        currDir = process.cwd();
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'universal-minifier-tests-'));
        process.chdir(tmpDir);
    });

    this.afterEach(async function () {
        process.chdir(currDir);
        await fs.rm(tmpDir, { force: true, recursive: true });
    });

    it(`Test minifying empty document`, async () => {
        await performTest('', '');
    });

    it(`Test minifying simple document`, async () => {
        await performTest('foo', 'foo');
    });

    const trailingNewlineTests = [
        {
            name: 'no trailing newline',
            input: 'foo',
            output: 'foo',
        },
        {
            name: 'single trailing newline',
            input: 'foo\n',
            output: 'foo\n',
        },
        {
            name: 'two trailing newline',
            input: 'foo\n\n',
            output: 'foo\n',
        },
        {
            name: 'three trailing newline',
            input: 'foo\n\n\n',
            output: 'foo\n',
        },
    ];
    for (const variant of trailingNewlineTests) {
        it(`Test minifying trailing newlines - ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }

    const trailingWhitespaceTests = [
        {
            name: 'no trailing whitespace',
            input: 'foo\nbar\n',
            output: 'foo\nbar\n',
        },
        {
            name: 'single trailing space',
            input: 'foo \nbar\n',
            output: 'foo\nbar\n',
        },
        {
            name: 'single trailing tab',
            input: 'foo\t\nbar\n',
            output: 'foo\nbar\n',
        },
    ];
    for (const variant of trailingWhitespaceTests) {
        it(`Test minifying trailing whitespace - ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }
});
