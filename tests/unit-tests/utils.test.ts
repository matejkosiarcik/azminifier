import { expect } from 'chai';
import { wildcardToRegex } from '../../src/utils.ts';

const regexPrefix = /^(.*\/)?/;
const regexPostfix = /$/;

context('Utils', function () {
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
        it(`Simple conversion wildcard -> regex [${index + 1}]`, async () => {
            const expected = `${regexPrefix.source}${variant.output.source}${regexPostfix.source}`;
            const regex = wildcardToRegex(variant.input);
            expect(regex.source, 'Output regex should equal').eq(expected);
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
        it(`Complex conversion wildcard -> regex [${index + 1}]`, async () => {
            const expected = `${regexPrefix.source}${variant.output.source}${regexPostfix.source}`;
            const regex = wildcardToRegex(variant.input);
            expect(regex.source, 'Output regex should equal').eq(expected);
        });
    }
});
