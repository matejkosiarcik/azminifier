import { test, describe } from 'node:test';
import { wildcardToRegex } from '../../src/utils.ts';
import assert from 'node:assert';

const regexPrefix = /^(.*\/)?/;
const regexPostfix = /$/;

describe('Utils', function () {
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
            assert.strictEqual(regex.source, expected, 'Output regex should equal');
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
            assert.strictEqual(regex.source, expected, 'Output regex should equal');
        });
    }
});
