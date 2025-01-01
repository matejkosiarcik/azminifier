import { test } from '@playwright/test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'py',
        minifyOptions: {
            preset: 'default',
        },
    });
}

test.describe('Minify Python', () => {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async () => {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async () => {
        await teardownTest(currDir, tmpDir);
    });

    test(`Minify empty document`, async () => {
        await performTest('', '');
    });

    test(`Minify simple document`, async () => {
        await performTest('foo   =   "foo"', 'foo="foo"');
    });

    test(`Minify document with line endings as LF (unix)`, async () => {
        await performTest('print(1)\nprint(2)\n', 'print(1)\nprint(2)');
    });

    test(`Minify document with line endings as CR+LF (windows)`, async () => {
        await performTest('print(1)\r\nprint(2)\r\n', 'print(1)\nprint(2)');
    });

    const newlineDocuments = [
        {
            input: 'print(1)\nprint(2)',
            output: 'print(1)\nprint(2)',
        },
        {
            input: 'print(1)\rprint(2)',
            output: 'print(1)\nprint(2)',
        },
        {
            input: 'print(1)\r\nprint(2)',
            output: 'print(1)\nprint(2)',
        },
        {
            input: 'print(1)\n\rprint(2)',
            output: 'print(1)\nprint(2)',
        },
    ];
    for (const [index, variant] of newlineDocuments.entries()) {
        test(`Minify document with newlines ${index + 1}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }
});
