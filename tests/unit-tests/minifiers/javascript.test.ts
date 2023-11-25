import { test, describe } from 'node:test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'js',
    });
}

describe('JavaScript', function () {
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
        await performTest('let foo = "foo";', 'let foo="foo";');
    });
});
