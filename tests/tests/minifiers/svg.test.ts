import { test } from '@playwright/test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string, options?: { extension?: string | undefined } | undefined) {
    const extension = options?.extension ?? 'svg';
    await performSimpleTest({
        input: input,
        output: output,
        extension: extension,
        minifyOptions: {
            preset: 'default',
        },
    });
}

test.describe('Minify SVG', () => {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async () => {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async () => {
        await teardownTest(currDir, tmpDir);
    });

    test(`Test minifying empty document`, async () => {
        await performTest('', '');
    });

    test(`Test minifying doctype document`, async () => {
        await performTest('<?xml version="1.0" encoding="utf-8"?>', '');
    });

    test(`Test minifying simple document`, async () => {
        await performTest('<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" height="100" viewBox="0 0 100 100" width="100">\n<rect/>\n</svg>', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect/></svg>');
    });
});
