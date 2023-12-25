import { test, describe } from 'node:test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string, minifyOptions?: { preset?: 'safe' | 'default' | 'brute' | undefined } | undefined) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'xml',
        minifyOptions: {
            preset: minifyOptions?.preset ?? 'default',
        },
    });
}

describe('Minify XML', function () {
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

    const simpleTests = [
        {
            input: '<foo>',
            output: '<foo>'
        },
        {
            input: '<foo />',
            output: '<foo/>'
        },
        {
            input: '<foo   />',
            output: '<foo/>'
        },
        {
            input: '<foo>  bar  </foo>',
            output: '<foo> bar </foo>'
        },
        {
            input: '<foo>\n bar\n</foo>',
            output: '<foo> bar </foo>'
        },
        {
            input: '<?xml version="1.0"?>\n<foo />',
            output: '<?xml version="1.0"?><foo/>'
        },
    ];
    for (const [index, variant] of simpleTests.entries()) {
        test(`Test minifying simple document - ${index + 1}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }

    const presetTests = [
        {
            preset: 'safe',
            input: '<foo>\n  foo <bar /> baz </foo>',
            output: '<foo>\n  foo <bar/> baz </foo>',
        },
        {
            preset: 'default',
            input: '<foo>\n  foo <bar /> baz </foo>',
            output: '<foo> foo <bar/> baz </foo>',
        },
        {
            preset: 'brute',
            input: '<foo>\n  foo <bar /> baz </foo>',
            output: '<foo>foo<bar/>baz</foo>',
        },
    ] as const;
    for (const variant of presetTests) {
        test(`Test minifying document whitespace - preset ${variant.preset}`, async () => {
            await performTest(variant.input, variant.output, { preset: variant.preset});
        });
    }
});
