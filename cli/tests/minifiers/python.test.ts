import { test, describe } from 'node:test';
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

describe('Minify Python', function () {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async function () {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async function () {
        await teardownTest(currDir, tmpDir);
    });

    test(`Minify empty document`, async () => {
        await performTest('', '');
    });

    test(`Minify simple document`, async () => {
        await performTest('foo   =   "foo"', 'foo="foo"');
    });

    test(`Minify document with LF`, async () => {
        await performTest('print(1)\nprint(2)\n', 'print(1)\nprint(2)');
    });

    test(`Minify document with CR+LF`, async () => {
        await performTest('print(1)\r\nprint(2)\r\n', 'print(1)\nprint(2)');
    });
});
