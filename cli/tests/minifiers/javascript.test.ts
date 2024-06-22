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

    test(`Minify simple document`, async () => {
        await performTest('let foo = "foo";', 'let foo="foo";');
    });
});
