import { test, expect } from '@playwright/test';
import { wildcardToRegex } from '../../src/utils/utils.ts';

const regexPrefix = /^(.*\/)?/;
const regexPostfix = /$/;

test.describe('Utils', () => {
    const variants = [
        {
            input: '.',
            output: /\./,
        },
        {
            input: '*',
            output: /[^/\\]*/,
        },
        {
            input: '?',
            output: /./,
        },
        {
            input: '+',
            output: /\+/,
        },
        {
            input: '-',
            output: /\-/,
        },
        {
            input: '\\',
            output: /\\/,
        },
        {
            input: '[',
            output: /\[/,
        },
        {
            input: ']',
            output: /\]/,
        },
        {
            input: '**',
            output: /.*/,
        },
    ];
    for (let [index, variant] of variants.entries()) {
        test(`Simple conversion wildcard -> regex [${index + 1}]`, async () => {
            const expected = `${regexPrefix.source}${variant.output.source}${regexPostfix.source}`;
            const regex = wildcardToRegex(variant.input);
            expect(regex.source, 'Output regex should equal').toEqual(expected);
        });
    }

    const variants2 = [
        {
            input: '?.*',
            output: /.\.[^/\\]*/,
        },
        {
            input: '*.{yml,yaml}',
            output: /[^/\\]*\.(yml|yaml)/,
        },
        {
            input: '**/*.js',
            output: /.*\/[^/\\]*\.js/,
        },
    ];
    for (let [index, variant] of variants2.entries()) {
        test(`Complex conversion wildcard -> regex [${index + 1}]`, async () => {
            const expected = `${regexPrefix.source}${variant.output.source}${regexPostfix.source}`;
            const regex = wildcardToRegex(variant.input);
            expect(regex.source, 'Output regex should equal').toEqual(expected);
        });
    }
});
