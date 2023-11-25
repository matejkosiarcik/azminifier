import { test, describe } from 'node:test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string, options?: { extension?: string | undefined } | undefined) {
    const extension = options?.extension ?? 'txt';
    await performSimpleTest({
        input: input,
        output: output,
        extension: extension,
    });
}

describe('Minify Plain Text', function () {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async function () {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async function () {
        await teardownTest(currDir, tmpDir);
    });

    test(`Test minifying empty document`, async () => {
        await performTest('', '');
    });

    test(`Test minifying simple document`, async () => {
        await performTest('foo', 'foo');
    });

    let markdownExtensions = ['md', 'mdown', 'markdown'];
    for (const extension of markdownExtensions) {
        test(`Test minifying simple markdown (.${extension}) document`, async () => {
            await performTest('# Foo  ', '# Foo', { extension: extension });
        });
    }

    const trailingNewlineTests = [
        {
            name: 'no trailing newline',
            input: 'foo',
            output: 'foo',
        },
        {
            name: 'single trailing newline',
            input: 'foo\n',
            output: 'foo\n',
        },
        {
            name: 'two trailing newlines',
            input: 'foo\n\n',
            output: 'foo\n',
        },
        {
            name: 'three trailing newlines',
            input: 'foo\n\n\n',
            output: 'foo\n',
        },
    ];
    for (const variant of trailingNewlineTests) {
        test(`Test minifying trailing newlines - ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }

    const trailingWhitespaceTests = [
        {
            name: 'no trailing whitespace',
            input: 'foo\nbar\n',
            output: 'foo\nbar\n',
        },
        {
            name: 'single trailing space',
            input: 'foo \nbar\n',
            output: 'foo\nbar\n',
        },
        {
            name: 'single trailing tab',
            input: 'foo\t\nbar\n',
            output: 'foo\nbar\n',
        },
        {
            name: 'complex trailing whitespace',
            input: 'foo\t  \t  \nbar\n',
            output: 'foo\nbar\n',
        },
    ];
    for (const variant of trailingWhitespaceTests) {
        test(`Test minifying trailing whitespace - ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }

    const otherTests = [
        {
            name: 'multiple newlines in content',
            input: 'foo\n\n\n\n\nbar\n\n\nbar\n',
            output: 'foo\n\nbar\n\nbar\n',
        },
        {
            name: 'complex content',
            input: 'foo \t \t\n\n\nbar\n\n\nbar\n\n',
            output: 'foo\n\nbar\n\nbar\n',
        },
    ];
    for (const variant of otherTests) {
        test(`Test minifying - ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });
    }
});
