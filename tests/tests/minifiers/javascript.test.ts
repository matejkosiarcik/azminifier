import { test } from '@playwright/test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'js',
        minifyOptions: {
            preset: 'default',
        },
    });
}

test.describe('Minify JavaScript', () => {
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
            input: 'let foo = "foo";',
            output: 'let foo="foo";',
        },
        {
            input: 'var foo = "foo";',
            output: 'var foo="foo";',
        },
        {
            input: 'const foo = "foo";',
            output: 'const foo="foo";',
        },
        {
            input: 'let foo = "foo"',
            output: 'let foo="foo";',
        },
        {
            input: 'let foo = "foo"; let bar = "bar";',
            output: 'let foo="foo",bar="bar";',
        },
        {
            input: 'let foo = "foo";const bar = "bar";',
            output: 'let foo="foo";const bar="bar";',
        },
        {
            input: 'let foo = "foo" \n const bar = "bar" ',
            output: 'let foo="foo";const bar="bar";',
        }
    ];
    for (const [index, variant] of simpleDocuments.entries()) {
        test(`Minify simple document ${index + 1}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }

    const newlineDocuments = [
        {
            input: 'console.log(1)\nconsole.log(2)\n',
            output: 'console.log(1);console.log(2);',
        },
        {
            input: 'console.log(1)\rconsole.log(2)',
            output: 'console.log(1);console.log(2);',
        },
        {
            input: 'console.log(1)\r\nconsole.log(2)',
            output: 'console.log(1);console.log(2);',
        },
        {
            input: 'console.log(1)\n\rconsole.log(2)',
            output: 'console.log(1);console.log(2);',
        },
    ];
    for (const [index, variant] of newlineDocuments.entries()) {
        test(`Minify document with newlines ${index + 1}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }
});
