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

    const simpleDocuments = [
        {
            input: 'foo   =   "foo"  ',
            output: 'foo="foo"',
        },
        {
            input: 'foo   =   "foo"\nbar = "bar"',
            output: 'foo="foo"\nbar="bar"',
        },
    ];
    for (const [index, variant] of simpleDocuments.entries()) {
        test(`Minify simple document ${index + 1}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }

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
