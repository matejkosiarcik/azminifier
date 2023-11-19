import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'js',
    });
}

context('JavaScript', function () {
    let tmpDir: string;
    let currDir: string;

    this.beforeEach(async function () {
        [currDir, tmpDir] = await setupTest();
    });

    this.afterEach(async function () {
        await teardownTest(currDir, tmpDir);
    });

    it(`Minify empty document`, async () => {
        await performTest('', '');
    });

    it(`Minify simple document`, async () => {
        await performTest('let foo = "foo";', 'let foo="foo";');
    });
});
