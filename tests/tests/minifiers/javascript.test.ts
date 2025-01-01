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
            output: 'let foo="foo";let bar="bar";',
        },
        {
            input: 'let foo = "foo" \n let bar = "bar" ',
            output: 'let foo="foo";let bar="bar";',
        }
    ];
    for (const [index, variant] of simpleDocuments.entries()) {
        test(`Minify simple document ${index}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }
});
